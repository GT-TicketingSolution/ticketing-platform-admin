/**
 * Shared filtering utility functions for dashboard & management modules.
 */

export function extractUniqueAttractions(rawLocations: string[]): string[] {
  const set = new Set<string>();
  rawLocations.forEach((item) => {
    if (!item) return;
    item.split(",").forEach((name) => {
      const trimmed = name.trim();
      if (trimmed) set.add(trimmed);
    });
  });
  return Array.from(set).sort();
}

/**
 * Checks if a status field matches the selected status filter ("All", "Active", "Inactive").
 */
export function matchesStatusFilter(status: string, selectedFilter: string): boolean {
  if (!selectedFilter || selectedFilter === "All") return true;
  return status.toLowerCase() === selectedFilter.toLowerCase();
}

/**
 * Checks if a comma-separated or single attraction string matches the selected attraction filter.
 */
export function matchesAttractionFilter(attractionString: string, selectedFilter: string): boolean {
  if (!selectedFilter || selectedFilter === "All") return true;
  const attractions = attractionString.split(",").map((a) => a.trim().toLowerCase());
  return attractions.includes(selectedFilter.toLowerCase());
}
