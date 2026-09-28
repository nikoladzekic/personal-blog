---
type: bounty
title: "Writing HTML Into Someone Else's Inbox With an Unauthenticated GraphQL Mutation"
date: 2026-09-28
platform: other
program: "Redacted — developer portal, large payments company"
severity: medium
tags: ["graphql", "authorization", "idor", "html-injection", "csp", "bug-bounty"]
description: "One mutation trusted its own userId argument and needed no session at all. The body rendered as HTML. Only the CSP nonce stopped it from becoming account takeover."
draft: false
---

Hey all, been a while since I've posted anything here but I wanted to share with you one of my *first fully resolved* bugs I've found on Hackerone. Had a lot of fun poking at this one and it really made me respect the art of client side vulns much more.

## TL;DR

One GraphQL mutation on the portal created a notification for any user. It did not check who was calling it. The caller supplied the recipient's user ID as an argument, and the server used that argument as the authority for the write. No session cookie and no bearer token were needed. The notification body was then rendered as HTML with a permissive tag policy. An attacker could place an `iframe`, a link, an image or a `style` block into the victim's notification page and have it render on the portal's own domain.

Accepted as **Medium**. I could not achieve script execution, because the Content Security Policy held. This post explains the mechanism, what I tried against the CSP, and what the chain would have looked like if the policy had been weaker. The part I did not prove is marked as unproven.

## Finding the mutation

The front end talks to a single GraphQL endpoint. The schema was not introspectable in the environment I tested, so I built the picture from traffic instead — logged in, clicked through the account area with a proxy running, and read the operations the application sent by itself.

That pass gave me two useful things:

- A query returning the current user's own profile, including the internal user ID. This told me the shape of the identifier.
- A mutation named in the pattern `addUserNotification`, taking a `NotificationInput` object **and a separate `userId` argument**.

That separate `userId` argument is the part worth noticing. When a mutation takes a recipient as its own argument, the resolver has to choose between two identifiers: the one in the request, and the one attached to the session. The bug is almost always in that choice.

## Testing the authorization check

I took the captured mutation and removed things from it, one at a time. That is the whole method. Remove a header, replay, read the response.

Removing the JSON content type broke it. Removing the authorization header did not. The mutation returned success with no session and no token at all:

```http
POST /graphql HTTP/1.1
Host: portal.example.com
Content-Type: application/json

{
  "operationName": "addUserNotification",
  "variables": {
    "notification": {
      "group": "SYSTEM",
      "title": "Alert: unauthorized access prevented",
      "body": "<p>redacted</p>"
    }
  },
  "query": "mutation addUserNotification($notification: NotificationInput!) { addUserNotification(notification: $notification, userId: \"<victim_user_id>\") }"
}
```

Loading the notifications page as the victim showed the message. It arrived in the `SYSTEM` group, so it rendered with the same styling the platform uses for its own security alerts.

The root cause is a one-line problem, twice over. The resolver read the recipient from the mutation argument and never compared it to the session identity, **and** the endpoint itself sat outside the authentication middleware. Two separate omissions lined up.

## The identifier was not much of a barrier

The usual objection to this bug class: the attacker needs the victim's internal ID, which is random and not published anywhere. On this portal, workspaces were shared between several users, and a separate query returned workspace membership including identifiers for owners, administrators and developers. A previously reported history query, a lower severity issue I found right before this one, widened this further. This means that any low-privilege account inside a shared workspace could address every other member of it.

This is worth stating plainly in a report. A missing authorization check *plus a working enumeration path* is a different finding from a missing authorization check alone, and triage scores it differently.

## The body field rendered HTML

Next question: **what could the body contain?** I sent one tag at a time and watched what survived to the rendered page.

The filter allowed a set of formatting and embedding tags, including `iframe`, `img`, `a`, `object`, `style` and `math`. It blocked `script` on the way in.

GraphQL variables arrive inside JSON, and JSON lets you escape any character as `\uXXXX`. Writing `srcdoc` as `srcdoc` produces the exact same string after the JSON parser runs, but the raw bytes on the wire no longer contain the word the filter was searching for. The filter inspected the request *before* the decode; the application acted on the value *after* it. Any filter placed on the wrong side of a decoding step can be walked past this way.

In the pages I tested, inserting a null byte and a slash ahead of the attribute name caused the filter to treat the attribute as unrecognized, while the browser still applied it when it recovered from the malformed markup. The parser and the filter disagreed about where an attribute name begins. That disagreement is the bug.

With those two together I could place an `iframe` with a `srcdoc` attribute into the victim's notification page — and `srcdoc` accepts a whole HTML document as a string, including a `script` tag.

In the end payload looked something like:
```js
POST /graphql HTTP/1.1
Host: portal.example.com
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36
content-type: application/json

{"operationName":"addUserNotification","variables":{"notification":{"group":"SYSTEM","title":"Alert! Unauthorized access prevented","body":"<p>Our system has detected a login attempt from another device. While this may indicate a potential compromise of your account, we understand that you may have initiated the login from a different device. If this is the case, please disregard this message.</p><ul><li><strong>IP Address</strong>: 127.0.0.1</li><li><strong>User Agent</strong>: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36</li></ul><p>However, if you did not initiate this login attempt, we strongly advise you to <a \u0000/href=https://www.youtube.com/watch?v=dQw4w9WgXcQ>change your password</a> and contact our <a \u0000/href=https://www.youtube.com/watch?v=dQw4w9WgXcQ>support</a> team.</p><p>We take the security of your account seriously and apologize for any inconvenience caused. Your safety is our top priority, and we appreciate your cooperation in resolving this matter promptly.</p><p>Kind regards,<br>Developer Studio Team</p>"}},"query":"mutation addUserNotification($notification: Notification!) {\n  addUserNotification(notification: $notification, userId:\"victim_user_id\")\n}\n"}
```

## What stopped me: the Content Security Policy

At this point the shape of a full account takeover was visible, and it did not work.

A document loaded from `srcdoc` does not get a fresh security context. It inherits the embedding document's CSP. So the script inside my injected document was judged by the same policy that governs the portal, and that policy required a nonce on every script.

A nonce is a random value the server puts into the policy and onto its own script tags on each page load. My injected HTML was written and stored long before the victim's page was generated, so I had no way to know the nonce that would be valid at render time. Stored injection and per-response nonces are a genuinely bad match for the attacker — that is the whole point of nonces.

I tried the obvious paths around it. None worked:

- **Reading the nonce from the parent document.** The `srcdoc` frame is same-origin, so this is not blocked by the origin policy — but the script that would do the reading is itself a script, so it needs a nonce first. The problem is circular.
- **Moving the payload to an event handler attribute** instead of a `script` tag. Inline event handlers are covered by the same policy and were refused.
- **A `style` block for a pure CSS attack.** This works for some data exfiltration tricks, but the fields I could reach did not carry anything worth exfiltrating this way.
- **An `iframe` pointing at an external page** instead of `srcdoc`. The frame source was restricted, and an external document cannot read the parent anyway.

So the finding went in as what it was: unauthenticated write access to another user's notification feed, with HTML rendering, without proven script execution.

## What the chain would have looked like without the nonce

**This section describes an outcome I did not achieve.** I include it because it explains why the finding deserves a fix rather than a shrug, and because the difference between the two outcomes is one line of policy configuration.

CSPs come in two broad styles. A nonce-based policy trusts a value that changes on every response. A host-allowlist policy trusts whole domains — usually analytics, tag managers and CDNs that the marketing stack needs.

A host allowlist is only as strong as the weakest endpoint on every domain it trusts. The classic weak endpoint is a JSONP callback: a URL that takes the name of a JavaScript function as a query parameter and echoes it back into a script response. If any allowlisted analytics domain exposes one, an attacker can load a script from a trusted domain and choose part of its contents. That is enough to start a chain.

In that scenario, the rest follows from the position the injection already has:

1. The injected script runs on the portal's own origin, inside the victim's authenticated session.
2. It calls the same GraphQL endpoint the application uses, with the victim's cookies attached.
3. It reads the workspace queries, which return member names, email addresses and identity provider references across every workspace the victim belongs to.
4. It performs whatever mutations the victim is allowed to perform, including inviting an attacker-controlled account.

None of that needs a password, and none of it is visible to the victim, because the notification looks like a routine security alert.

I want to be precise about the condition. A JSONP endpoint on an allowlisted host helps an attacker **only when the policy actually trusts hosts for scripts**. A policy built on nonces with `strict-dynamic` ignores host allowlists for scripts entirely, and the JSONP path gives nothing. This is the practical argument for `strict-dynamic`: it makes the size of your vendor allowlist stop mattering.

## What generalizes

The reusable part is a short list of questions for any GraphQL mutation.

- **Does the mutation take a subject as an argument, separate from the session?** If yes, replay it with a different subject and with no credentials at all.
- **Is the authorization check on the resolver only, or is the endpoint also behind authentication middleware?** These fail independently.
- **If the subject is a random identifier, is there any query that lists identifiers?** Shared objects such as workspaces, teams and audit histories are the usual sources.
- **Does any text field reach the DOM as HTML?** Send one tag at a time and read the rendered page, not the API response.
- **Where does the filter sit relative to the decoders?** Anything parsed after the filter runs; JSON escapes, URL encoding, HTML entities, is a way past it.


That would be all for this post, hope you learned something new like I did. Thank you for reading it all through the very end, cheers!
