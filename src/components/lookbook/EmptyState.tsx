interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[--surface-inset] flex items-center justify-center mb-4">
        <span className="text-2xl text-[--text-tertiary]">+</span>
      </div>
      <h3 className="text-lg font-medium text-[--text-primary] mb-2">{title}</h3>
      <p className="text-sm text-[--text-tertiary] max-w-md">{description}</p>
    </div>
  );
}
