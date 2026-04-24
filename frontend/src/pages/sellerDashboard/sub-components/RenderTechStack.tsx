export const RenderTechStack = (
  techStack: string[],
  maxVisible: number = 3
) => {
  if (!techStack || techStack.length === 0) return null;

  const visibleTechs = techStack.slice(0, maxVisible);
  const extraTechs = techStack.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-2">
      {visibleTechs.map((tech) => (
        <span
          key={tech}
          className="px-3 py-1.5 bg-neutral-800 dark:bg-white text-white dark:text-neutral-800 font-space font-bold uppercase tracking-wider text-sm border-2 border-transparent truncate max-w-[100px]"
        >
          {tech}
        </span>
      ))}
      {extraTechs > 0 && (
        <span className="px-3 py-1.5 bg-gray-200 dark:bg-gray-800 text-neutral-800 dark:text-white font-space font-bold uppercase tracking-wider text-sm border-2 border-neutral-800 dark:border-white">
          +{extraTechs}
        </span>
      )}
    </div>
  );
};
