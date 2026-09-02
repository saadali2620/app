interface AboutPageProps {
  navigate: (path: string) => void;
}

export default function AboutPage({ navigate }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-black pt-20">
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/8782539/pexels-photo-8782539.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
          alt=""
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <p className="text-white/50 text-[11px] uppercase tracking-[0.3em] mb-4">est. 2021</p>
            <h1 className="text-white text-5xl sm:text-7xl font-bold tracking-tight">nors.</h1>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-6 py-20 lg:py-28">
        <div className="text-center mb-16">
          <h2 className="text-white text-3xl sm:text-4xl font-bold tracking-tight mb-6">
            The Grey Area Between Fashion and Streetwear
          </h2>
        </div>

        <div className="space-y-8 text-white/70 text-base leading-relaxed">
          <p>
            nors. was born in Karachi in 2021 — a city that never sleeps, never compromises, and never
            stops creating. We exist in the grey area between fashion and streetwear, drawing from
            the energy of the streets and the discipline of the atelier.
          </p>
          <p>
            Every piece is part of a limited edition seasonal collection. We embrace the current
            culture, translating it into garments that feel relevant the moment they drop and for
            years after. No restocks. No compromises. When it's gone, it's gone.
          </p>
          <p>
            We source locally with an obsessive attention to fit, fabric, and fabrication. Every
            seam, every wash, every print is a decision we make deliberately. Our pieces are
            proudly made in Pakistan by hands that know the craft.
          </p>
          <p>
            We are not for everyone. We are for those who represent.
          </p>
        </div>

        <div className="mt-16 pt-12 border-t border-white/10 grid sm:grid-cols-3 gap-8 text-center">
          <div>
            <h3 className="text-white text-3xl font-bold mb-2">2021</h3>
            <p className="text-white/40 text-[11px] uppercase tracking-[0.18em]">Established</p>
          </div>
          <div>
            <h3 className="text-white text-3xl font-bold mb-2">1</h3>
            <p className="text-white/40 text-[11px] uppercase tracking-[0.18em]">Batches Dropped</p>
          </div>
          <div>
            <h3 className="text-white text-3xl font-bold mb-2">100%</h3>
            <p className="text-white/40 text-[11px] uppercase tracking-[0.18em]">Made in Pakistan</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center px-6 border-t border-white/10">
        <button
          onClick={() => navigate('/collections/all')}
          className="inline-block bg-white text-black px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 transition-all hover:scale-105 duration-300"
        >
          Shop the Collection
        </button>
      </section>
    </div>
  );
}
