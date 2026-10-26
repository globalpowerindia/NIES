/** Summarizes all approved ratings, not just the latest visible review cards. */
export const summarizeReviewRatings = (reviews: ReadonlyArray<{ rating: number }>) => {
  const counts = [0, 0, 0, 0, 0]
  for (const { rating } of reviews) {
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) counts[rating - 1]++
  }
  const count = counts.reduce((sum, value) => sum + value, 0)
  const total = counts.reduce((sum, value, index) => sum + value * (index + 1), 0)
  return {
    count,
    average: count ? total / count : 0,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: counts[stars - 1],
      percent: count ? Math.round(counts[stars - 1] / count * 100) : 0,
    })),
  }
}
