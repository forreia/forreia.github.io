const notes = [
    {
        title: "Birthday 2026",
        href: "notes/birthday-2026/",
        date: "2026-09-10",
        displayDate: "September 10, 2026",
        emoji: "🎂"
    },
    {
        title: "Valentine 2026",
        href: "notes/valentine-2026/",
        date: "2026-02-14",
        displayDate: "February 14, 2026",
        emoji: "❤️"
    }
];

function renderNotes() {
    const list = document.getElementById("notes-list");
    const ordered = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = ordered.map((note, index) => {
        const latest = index === 0;
        return `
            <li>
                <a class="note-card${latest ? " latest" : ""}" href="${note.href}">
                    ${latest ? '<span class="latest-badge">Latest</span>' : ""}
                    <span class="note-emoji" aria-hidden="true">${note.emoji}</span>
                    <span class="note-copy">
                        <span class="note-title">${note.title}</span>
                        <span class="note-meta">${note.displayDate}</span>
                    </span>
                    <span class="note-arrow" aria-hidden="true">→</span>
                </a>
            </li>
        `;
    }).join("");
}

document.addEventListener("DOMContentLoaded", renderNotes);
