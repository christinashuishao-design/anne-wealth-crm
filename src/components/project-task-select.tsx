"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export type ProjectTaskOption = {
  id: string;
  title: string;
  code?: string;
};

export function ProjectTaskSelect({
  projects,
  defaultOpportunityId = "",
  defaultTitle = "",
}: {
  projects: ProjectTaskOption[];
  defaultOpportunityId?: string;
  defaultTitle?: string;
}) {
  const selectedProject = projects.find(
      (project) => project.id === defaultOpportunityId,
    ),
    [opportunityId, setOpportunityId] = useState(defaultOpportunityId),
    [title, setTitle] = useState(selectedProject?.title || defaultTitle),
    [open, setOpen] = useState(false),
    filtered = useMemo(
      () =>
        projects
          .filter((project) =>
            `${project.code || ""} ${project.title}`
              .toLowerCase()
              .includes(title.toLowerCase()),
          )
          .slice(0, 30),
      [projects, title],
    );
  return (
    <div className="relative mt-1">
      <input name="title" type="hidden" value={title} />
      <input name="opportunity_id" type="hidden" value={opportunityId} />
      <div className="flex items-center rounded-xl border border-[#d8ccb8] bg-white px-3">
        <Search size={15} className="text-neutral-400" />
        <input
          aria-label="搜索项目或填写任务名称"
          className="w-full px-2 py-2.5 outline-none"
          onChange={(event) => {
            setTitle(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="输入项目编号、项目名称或自定义任务"
          required
          value={title}
        />
        <ChevronDown size={16} />
      </div>
      {open && (
        <div className="absolute z-[90] mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-white p-1 shadow-xl">
          {filtered.map((project) => (
            <button
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f5efe5]"
              key={project.id}
              onClick={() => {
                setOpportunityId(project.id);
                setTitle(project.title);
                setOpen(false);
              }}
              type="button"
            >
              <span className="font-medium">{project.title}</span>
              {project.code && (
                <span className="ml-2 text-xs text-neutral-400">{project.code}</span>
              )}
            </button>
          ))}
          {!filtered.length && (
            <div className="p-3 text-sm text-neutral-400">
              没有匹配项目，可直接使用当前文字作为任务名称
            </div>
          )}
        </div>
      )}
    </div>
  );
}
