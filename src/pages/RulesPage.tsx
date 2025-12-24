import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';

const RulesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
            <h1 className="text-3xl font-bold mb-6">Rules of Fish</h1>

            <p className="text-lg text-gray-600 mb-8">
              Fish is a classic card game for 4, 6, or 8 players, split into two equal teams.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Set-Up</h2>
              <p>
                Players are divided into two equal teams. The deck is automatically prepared and dealt evenly among all players.
              </p>
              <p className="mt-4">
                The deck contains no 8s, leaving eight half-suits: low cards (2, 3, 4, 5, 6, 7) and high cards (9, 10, J, Q, K, A) for each suit—clubs, diamonds, hearts, and spades.
              </p>
              <p className="mt-4 font-medium">
                The objective of Fish is for your team to secure more half-suits than the opposing team.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Gameplay</h2>
              <p>
                Each player's aim is to gather and track information about which cards and half-suits are held by every player. A player is allowed to ask another player for a card only if:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2">
                <li>The requested card belongs to a half-suit of which the asker already holds at least one card, and</li>
                <li>The asker does not already possess the specific card being requested.</li>
              </ul>
              <p className="mt-4 italic">
                You may only ask opponents for cards—never your own teammates.
              </p>
              <p className="mt-4 italic">
                If the opponent has the card, they must give it to you and you get to ask again.
              </p>
              <p className="mt-4 italic">
                If they don't have it, the turn passes to them and they become the asker.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Illegal Questions</h2>
              <p>
                A question becomes illegal if either of the two above conditions is violated. This most often happens when players continue probing a half-suit after they no longer hold a card from it.
              </p>
              </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Making a Declaration</h2>
              <p>
                A player's strategy typically focuses on either collecting an entire half-suit personally or determining exactly which teammates hold each card of a half-suit. Once a player either holds all six cards of a half-suit or knows the precise location of every card in that half-suit among their teammates, they may declare.
              </p>
              <p className="mt-4">
                A declaration is a formal statement that the declaring player knows their team possesses an entire half-suit and can correctly identify which player holds each card.
              </p>
              <p className="mt-4 font-medium text-red-600">
                Declarations are serious actions and should only be made when the player is completely certain.
              </p>
              <p className="mt-4 font-medium">
                If a declaration is incorrect, the opposing team automatically gains that half-suit, regardless of where the cards actually were.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Winning the Game</h2>
              <p>
                The outcome of the game is decided entirely by declarations. The team that successfully declares the greatest number of half-suits wins. Making an uncertain declaration is a guaranteed way to hand victory to the other team.
              </p>
            </section>

            
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
              <p className="text-center text-gray-700">
                That concludes the overview of how to play Fish. The rest is deduction, teamwork, and keeping your head straight.
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
};

export default RulesPage;
