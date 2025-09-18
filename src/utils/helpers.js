export function cleanTags(tags, tags_array) {
  if (Array.isArray(tags_array)) {
    return tags_array.map(t => String(t).replace(/(^"|"$)/g, "").trim()).filter(Boolean);
  }
  if (typeof tags === "string") {
    return tags.split("|").map(t => t.replace(/(^"|"$)/g, "").trim()).filter(Boolean);
  }
  return [];
}