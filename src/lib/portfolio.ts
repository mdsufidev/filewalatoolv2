export const portfolioConfig = {
  ownerName: "Muhammad Sufiyan",
  alternateNames: ["Md Sufi", "Sufi111729"],
  role: "Java Full Stack Developer",
  country: "IN",
  url: "https://muhammadsufiyan.filewalatool.com",
  githubUrl: "https://github.com/Sufi111729",
  ogImage: "/founder-muhammad-sufiyan.webp",
  description:
    "Muhammad Sufiyan is a Java Full Stack Developer in India specializing in Java, Spring Boot, React, REST APIs, MySQL, responsive web applications, and practical AI-powered features.",
  socialDescription:
    "Java Full Stack Developer specializing in Java, Spring Boot, React, REST APIs, MySQL, and modern web applications.",
  keywords: [
    "Muhammad Sufiyan",
    "Muhammad Sufiyan developer",
    "Muhammad Sufiyan Java developer",
    "Muhammad Sufiyan full stack developer",
    "Java Full Stack Developer India",
    "Java Developer",
    "Spring Boot Developer",
    "React Developer",
    "Md Sufi developer",
    "Sufi111729",
  ],
  skills: [
    "Java",
    "Spring Boot",
    "React",
    "TypeScript",
    "JavaScript",
    "REST APIs",
    "MySQL",
    "Git",
    "GitHub",
    "Vercel",
    "Full Stack Development",
    "Web Development",
  ],
  knowsAbout: [
    "Java",
    "Spring Boot",
    "React",
    "TypeScript",
    "JavaScript",
    "REST APIs",
    "MySQL",
    "Full Stack Development",
    "Web Development",
  ],
};

export const portfolioProjects = [
  {
    slug: "filewalatool",
    name: "FileWalaTool",
    path: "/projects/filewalatool",
    url: "https://www.filewalatool.com",
    title: "FileWalaTool by Muhammad Sufiyan",
    description:
      "FileWalaTool is a browser-based platform for image, PDF, conversion, and document tools built with a Next.js frontend and practical file-processing workflows.",
    summary:
      "A browser-based platform for image tools, PDF tools, file conversion, and document photo workflows.",
    technologies: ["Next.js", "React", "TypeScript", "JavaScript", "Vercel"],
    highlights: [
      "Public tool pages for image, PDF, conversion, and document workflows.",
      "Browser-first processing for many file tasks.",
      "Responsive pages with crawlable metadata, sitemap entries, and structured data.",
    ],
  },
];

export function portfolioAbsoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${portfolioConfig.url}${normalizedPath === "/" ? "/" : normalizedPath}`;
}
