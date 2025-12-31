import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import SEO from '@/components/SEO';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="About"
        description="Learn more about Fish, the online multiplayer card game."
        canonical="/about"
      />
      <Header type="home" />

      <main className="flex-1 overflow-y-auto p-3">
        <div className="container mx-auto max-w-3xl">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <article className="prose prose-gray max-w-none">
            <h1 className="text-3xl font-bold mb-6">About</h1>

            <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
              <p className="text-center text-gray-700">
                Come back later for more info!
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;
