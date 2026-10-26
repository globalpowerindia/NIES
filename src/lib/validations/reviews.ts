import { z } from 'zod'

export const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1, 'Choose a rating from 1 to 5.').max(5),
  title: z.string().trim().min(3, 'Add a title of at least 3 characters.').max(120),
  body: z.string().trim().min(10, 'Write at least 10 characters about your experience.').max(2500),
})

export type ReviewInput = z.infer<typeof reviewSchema>
