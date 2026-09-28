// The tags every list has, in order. More can be made on any item.
// When one of these is the only filter, `done` names its finished section and `placeholder` the add box.
export const DEFAULT_TAGS = [
  { name: "Podcasts", done: "Listened", placeholder: "Add a podcast or a link…" },
  { name: "Songs", done: "Listened", placeholder: "Add a song or a link…" },
  { name: "Movies", done: "Watched", placeholder: "Add a film, a series or a link…" },
  { name: "Education", done: "Done", placeholder: "Add a course, a talk or a link…" },
  { name: "Questions", done: "Answered", placeholder: "Add a question…" },
];

export const tagInfo = (name) => DEFAULT_TAGS.find((t) => t.name.toLowerCase() === name.toLowerCase());
