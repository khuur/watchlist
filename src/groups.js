// The groups a list is split into, in tab order. `done` names the section of finished items.
export const GROUPS = [
  { id: "podcasts", name: "Podcasts", done: "Listened", placeholder: "Add a podcast or a link…" },
  { id: "songs", name: "Songs", done: "Listened", placeholder: "Add a song or a link…" },
  { id: "movies", name: "Movies", done: "Watched", placeholder: "Add a film, a series or a link…" },
  { id: "education", name: "Education", done: "Done", placeholder: "Add a course, a talk or a link…" },
  { id: "questions", name: "Questions", done: "Answered", placeholder: "Add a question…" },
];

// Items from before there were groups were all films.
export const DEFAULT_GROUP = "movies";

export const groupById = (id) => GROUPS.find((g) => g.id === id) ?? groupById(DEFAULT_GROUP);
