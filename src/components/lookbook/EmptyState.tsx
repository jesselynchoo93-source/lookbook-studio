interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <span className="text-2xl text-gray-600">+</span>
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md">{description}</p>
    </div>
  );
}
