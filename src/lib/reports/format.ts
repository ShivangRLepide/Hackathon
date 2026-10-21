const FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** Formats a stored timestamp in UTC so every view shows the same time. */
export function formatTimestamp(iso: string): string {
  return `${FORMAT.format(new Date(iso))} UTC`;
}
