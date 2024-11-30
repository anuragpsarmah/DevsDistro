import { features } from "./animatedFeatureIcons";
import { MagicCard } from "@/components/ui/magic-card";

export default function FeatureSection() {
  return (
    <section id="features" className="py-24 bg-gray-900">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-4xl font-bold mb-16 text-center text-white">
          Why Choose DevExchange?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <MagicCard
              key={index}
              className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden transition-all duration-300"
              gradientSize={300}
              gradientColor="#3B82F6"
              gradientOpacity={0.2}
            >
              <div className={`bg-gradient-to-br ${feature.gradient} p-6`}>
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-white bg-opacity-20">
                  {feature.animatedIcon}
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-semibold mb-3 text-white min-h-[3rem]">
                  {feature.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </MagicCard>
          ))}
        </div>
      </div>
    </section>
  );
}
