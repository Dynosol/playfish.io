import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import { colors } from '@/utils/colors';

const aboutStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "About playfish.io",
  "description": "Learn about playfish.io, an online platform for playing the classic card game Fish (also known as Literature, Canadian Fish, or Russian Fish).",
  "mainEntity": {
    "@type": "WebApplication",
    "name": "playfish.io",
    "applicationCategory": "GameApplication",
    "operatingSystem": "Web Browser",
    "description": "Play Fish online with friends - a team-based card game of deduction and strategy"
  }
};

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="About - playfish.io"
        description="Learn about playfish.io, an online platform for playing Fish (Literature) - the classic team card game popular in competitive math circles."
        canonical="/about"
        type="article"
        structuredData={aboutStructuredData}
      />
      <Header type="home" />

      <main className="flex-1 overflow-y-auto p-3">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => navigate('/rules')}
              className="flex items-center gap-2 hover:opacity-70 underline"
              style={{ color: colors.green }}
            >
              Quick rules
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <article className="prose prose-gray max-w-none">
            <h1 className="text-3xl font-bold mb-6">About</h1>

            <section className="mb-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                playfish.io was created in late 2025 to provide a simple way to play the classic card game Fish (also known as Canadian Fish, Russian Fish, or Literature) online. Fish is a simple game that only requires one deck of cards (easy to come across) and five<sup>*</sup> willing friends (harder to come across), but despite its simplicity it strains the brain in memory and thought. This is probably what led it to gain popularity in high school competitive math circles, where it then trickled down into research, debate, and other circles.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                *Four-player and eight-player games are possible but less common.
              </p>
            </section>

            <hr className="my-8 border-gray-200" />

            <h2 className="text-2xl font-bold mb-6">Extended Rules Explanation</h2>

            <p className="text-gray-600 mb-6">
              Below is a comprehensive explanation of Fish rules. Some rules relate to in-person play and are handled automatically online (marked with <span style={{ color: colors.blue }}>ℹ️ Online note</span>).
            </p>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Overview</h3>
              <p>
                Fish is played by six or eight players in two teams (six is most common). Players sit in alternating order—each player sits between two opponents. Four 8's are removed from a standard 52-card deck, leaving 48 cards. These form eight half-suits of six cards each, called <strong>sets</strong> or <strong>books</strong>:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1">
                <li><strong>Low suits:</strong> 2, 3, 4, 5, 6, 7 of each suit</li>
                <li><strong>High suits:</strong> 9, 10, J, Q, K, A of each suit</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Objective</h3>
              <p>
                The objective is for your team to win more books than the opposing team. With eight books total, you need five to win outright. Ties at four each are possible.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Deal</h3>
              <p>
                The dealer shuffles and deals all cards out individually and face down. In a six-player game, each player receives 8 cards; in an eight-player game, 6 cards. Players look only at their own cards.
              </p>
              <p className="mt-3 px-4 py-2 rounded text-sm" style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                ℹ️ Online note: Dealing is handled automatically. Cards are distributed randomly.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Play</h3>
              <p>
                Usually, the dealer goes first. On your turn, you ask a specific opponent for a specific card. Your question must follow these rules:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2">
                <li>You must request a specific card (e.g., "Do you have the 7 of Spades?")</li>
                <li>You must hold at least one card from that half-suit</li>
                <li>The opponent you ask must hold at least one card</li>
                <li>You may not ask for a card you already hold</li>
                <li>You may not ask a teammate</li>
              </ul>
              <p className="mt-4">
                <strong>Example:</strong> If you only have the Jack of Diamonds, you may ask for the 9, 10, Q, K, or A of Diamonds—but not the Jack (you have it) or any low Diamond (you don't have a card in that half-suit).
              </p>
              <p className="mt-4">
                If the opponent has the card, they must hand it over face-up. You then continue your turn and may ask again (any opponent). If they don't have it, the turn passes to them.
              </p>
              <p className="mt-3 px-4 py-2 rounded text-sm" style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                ℹ️ Online note: The game enforces valid questions—you can only select cards you're allowed to ask for.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Claiming Books (Declarations)</h3>
              <p>
                A player who collects all six cards of a book can simply lay them down to claim it for their team. More commonly, when the cards are split among teammates, a player can <strong>declare</strong> by stating exactly who holds each card.
              </p>
              <p className="mt-3">
                <strong>Example:</strong> "I declare Low Spades. I have the 4 and 2, Mary has the 3, and Joseph has the 5, 6, and 7."
              </p>
              <p className="mt-3">
                The players reveal their cards. If the declaration is completely correct, the declaring team wins the book. If an opponent holds any of the cards, the opposing team wins the book. If the declaring team has all the cards but the distribution was stated incorrectly, <strong style={{ color: colors.red }}>the book is forfeited and neither team scores it</strong>.
              </p>
              <p className="mt-3">
                A player does not need to hold any cards from a book to declare it—you can declare based purely on deduction from the game's questions.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Information During Play</h3>
              <p>
                In traditional play:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2">
                <li>Any player may ask what the <strong>last question and answer</strong> was</li>
                <li>No information about earlier questions may be discussed</li>
                <li>Players may ask how many cards another player (including teammates) has</li>
                <li>No written records or notes are allowed</li>
              </ul>
              <p className="mt-3 px-4 py-2 rounded text-sm" style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                ℹ️ Online note: The game log shows the complete history of all questions, so the "last question only" rule doesn't apply. You cannot see your teammates' or opponents' card counts directly—you must track this yourself or deduce from the log.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Running Out of Cards</h3>
              <p>
                A player who runs out of cards drops out of active play and cannot be asked questions (so the turn cannot pass to them).
              </p>
              <p className="mt-3">
                However, if you run out of cards <em>because of a declaration you just made</em>, you may pass the turn to any teammate who still has cards.
              </p>
              <p className="mt-3">
                When an entire team runs out of cards, the opposing team must declare all remaining books. If it's the turn of someone on the team with cards, that player must make all remaining declarations alone (no consulting). If the turn belongs to the team with no cards, that player chooses which opponent must make the final declarations.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Strategy Tips</h3>
              <ul className="list-disc list-inside space-y-3">
                <li>
                  <strong>Information is everything.</strong> Every question reveals information—both to your teammates and to your opponents. Good players reveal enough to help their team while minimizing what opponents learn.
                </li>
                <li>
                  <strong>Don't rush declarations.</strong> If you're confident your team has a complete book but aren't 100% sure who has what, hold off. A wrong declaration gifts the book to your opponents.
                </li>
                <li>
                  <strong>Stalemate breakers.</strong> If your team holds a complete book and knows exactly where each card is, consider holding it in reserve. Later, if a teammate is stuck (knows where cards are but can't get the turn), you can declare the reserved book and pass the turn to them.
                </li>
                <li>
                  <strong>Lock out dangerous opponents.</strong> If an opponent has accumulated cards and knowledge that threatens your team's books, avoid asking them questions—don't give them the turn.
                </li>
                <li>
                  <strong>Track card counts.</strong> Knowing how many cards each player has helps narrow down possibilities and informs your declarations.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Common Variations</h3>
              <p>Different groups may play with slight rule variations:</p>
              <ul className="list-disc list-inside mt-3 space-y-2">
                <li>Removing 7s instead of 8s (low: A-6, high: 8-K)</li>
                <li>Adding jokers to create a ninth book</li>
                <li>High books scoring double points</li>
                <li>Allowing declarations at any time (not just on your turn)</li>
                <li>Allowing "bluff" questions for cards you already hold</li>
              </ul>
              <p className="mt-3 px-4 py-2 rounded text-sm" style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                ℹ️ Online note: playfish.io uses standard rules with 8s removed. Declarations can only be made on your turn.
              </p>
            </section>

            <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
              <p className="text-center text-gray-600 text-sm">
                Rules adapted from <a href="https://www.pagat.com/quartet/literature.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">pagat.com</a> and <a href="https://en.wikipedia.org/wiki/Literature_(card_game)" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">Wikipedia</a>.
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;
