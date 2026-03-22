"use client";

import { useState } from "react";
import type { ProjectRecord, ProjectStatus } from "@/lib/lookbook/types";
import { PRODUCT_FAMILY_LABELS, STYLE_LABELS } from "@/lib/lookbook/types";

interface ProjectListPanelProps {
  projects: ProjectRecord[];
  onNewProject: () => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, { label: string; classes: string }> = {
    draft: {
      label: "Draft",
      classes: "bg-[--surface-inset] text-[--text-tertiary]",
    },
    planned: {
      label: "Planned",
      classes: "bg-[--status-info-bg] text-[--status-info-text]",
    },
    in_progress: {
      label: "In Progress",
      classes: "bg-[--status-warning-bg] text-[--status-warning-text]",
    },
    complete: {
      label: "Complete",
      classes: "bg-[--status-success-bg] text-[--status-success-text]",
    },
  };

  const { label, classes } = config[status];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${classes}`}>
      {label}
    </span>
  );
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: ProjectRecord;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const familyLabel = PRODUCT_FAMILY_LABELS[project.input.productFamily];
  const styleLabel = STYLE_LABELS[project.input.targetStyle];
  const item = project.input.specificItem?.trim();

  const dateStr = new Date(project.updatedAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const refCount =
    project.references.model.length +
    project.references.product.length +
    project.references.styling.length;

  const shotInfo = project.plan
    ? `${project.plan.shots.length} shots`
    : "No plan yet";

  return (
    <div
      className="bg-[--surface-card] rounded-xl p-4 hover:opacity-95 transition-all group"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[--text-primary] truncate">
            {project.name}
          </h3>
          <p className="text-xs text-[--text-tertiary] mt-0.5">
            {item ? `${item} · ` : ""}{familyLabel} · {styleLabel}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-[--text-tertiary] mb-3">
        <span>{shotInfo}</span>
        {refCount > 0 && (
          <span>{refCount} ref{refCount !== 1 ? "s" : ""}</span>
        )}
        <span className="ml-auto">{dateStr}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpen}
          className="text-xs text-[--text-inverted] bg-[--text-primary] hover:opacity-90 px-3 py-1.5 rounded-lg transition-opacity"
        >
          Open
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] text-[--status-error-text]">Delete?</span>
            <button
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
              className="text-[11px] text-[--status-error-text] hover:opacity-80 px-2 py-1 rounded border border-[--status-error-text]/30 transition-opacity"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] text-[--text-tertiary] hover:text-[--text-secondary] px-2 py-1 rounded border border-[--border-default] transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[11px] text-[--text-tertiary] hover:text-[--status-error-text] ml-auto opacity-0 group-hover:opacity-100 transition-all"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectListPanel({
  projects,
  onNewProject,
  onOpenProject,
  onDeleteProject,
}: ProjectListPanelProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[--text-primary] mb-1">
            Lookbook Studio
          </h2>
          <p className="text-[--text-secondary] text-sm">
            {projects.length === 0
              ? "Start your first lookbook project."
              : `${projects.length} saved project${projects.length !== 1 ? "s" : ""}.`}
          </p>
        </div>
        <button
          onClick={onNewProject}
          className="bg-[--text-primary] text-[--text-inverted] text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shrink-0"
        >
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="border-2 border-dashed border-[--border-default] rounded-xl p-8 text-center">
          <p className="text-[--text-tertiary] text-sm mb-3">No projects yet.</p>
          <button
            onClick={onNewProject}
            className="text-sm text-[--text-secondary] hover:text-[--text-primary] border border-[--border-default] px-4 py-2 rounded-lg transition-colors"
          >
            Create your first lookbook
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => onOpenProject(project.id)}
              onDelete={() => onDeleteProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
