export default function CallForAction() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <h2 className="text-4xl font-bold mb-8">Ready to Join DevExchange?</h2>
        <p className="text-xl text-gray-300 mb-8">
          Start exploring innovative projects or showcase your own creations
          today.
        </p>
        <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg text-lg">
          Get Started Now
        </button>
      </div>
    </section>
  );
}
