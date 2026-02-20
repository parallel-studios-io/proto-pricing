"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import { ProjectCard } from "@/components/cards/ProjectCard";

interface Project {
  id: string;
  title: string;
  description: string;
  updatedAt: Date;
}

const demoProjects: Project[] = [
  {
    id: "1",
    title: "Pricing Analysis Q1",
    description:
      "Analysis of our current pricing structure, segment profitability, and recommendations for the Q1 price increase. Includes council evaluation from all C-suite agents.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
  },
  {
    id: "2",
    title: "MyParcel Competitor Review",
    description:
      "Competitive analysis of Sendcloud, ShipStation, and other shipping platforms. Pricing comparison and positioning recommendations.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
  {
    id: "3",
    title: "Platform Minimum Impact",
    description:
      "Modeling the impact of introducing a €9.99/month platform minimum. Includes churn projections and revenue scenarios.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
  },
];

export default function ProjectsPage() {
  const router = useRouter();

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    console.log("Create project");
  };

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Projects"
        action={{
          label: "Create project",
          onClick: handleCreateProject,
        }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex gap-4 border-b border-border pb-4">
          <button className="text-sm font-medium text-white">All Projects</button>
          <button className="text-sm text-muted-foreground hover:text-white">
            Favorites
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {demoProjects.map((project) => (
            <ProjectCard
              key={project.id}
              title={project.title}
              description={project.description}
              updatedAt={project.updatedAt}
              onClick={() => handleProjectClick(project.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
