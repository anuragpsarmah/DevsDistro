export const RenderTechStack = (
  techStack: string[],
  maxVisible: number = 3
) => {
  if (!techStack || techStack.length === 0) return null;

  const visibleTechs = techStack.slice(0, maxVisible);
  const extraTechs = techStack.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {visibleTechs.map((tech) => (
        <span
          key={tech}
          className={`
              px-2 py-1 
              bg-gray-700 text-gray-300
              text-xs rounded-full
              truncate max-w-[100px]
            `}
        >
          {tech}
        </span>
      ))}
      {extraTechs > 0 && (
        <span className="px-2 py-1 bg-gray-600 text-gray-400 text-xs rounded-full">
          +{extraTechs}
        </span>
      )}
    </div>
  );
};
