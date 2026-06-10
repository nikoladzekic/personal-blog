import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    description: z.string().optional(),
  }),
});

const researchSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('cve'),
    title: z.string(),
    date: z.date(),
    cve: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    cvss: z.number().optional(),
    vendor: z.string().optional(),
    patched: z.boolean().default(false),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal('bounty'),
    title: z.string(),
    date: z.date(),
    platform: z.enum(['hackerone', 'bugcrowd', 'intigriti', 'other']),
    program: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    cvss: z.number().optional(),
    bounty: z.string().optional(),
    reportUrl: z.string().url().optional(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal('research'),
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    description: z.string().optional(),
    references: z.array(z.string().url()).optional(),
  }),
]);

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }),
  schema: researchSchema,
});

export const collections = { blog, research };
