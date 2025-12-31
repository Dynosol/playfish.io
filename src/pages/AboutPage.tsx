import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
          </div>

          <article className="prose prose-gray max-w-none">
            <h1 className="text-3xl font-bold mb-6">About playfish.io</h1>

            {/* Table of Contents */}
            <nav className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
              <p className="font-semibold text-gray-700 mb-2">Contents</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>
                  <a href="#about" className="hover:text-gray-900 underline">About</a>
                  <span className="text-gray-400"> — Why we built this</span>
                </li>
                <li>
                  <a href="#rules" className="hover:text-gray-900 underline">Rules, Deeper Explained</a>
                  <span className="text-gray-400"> — Comprehensive gameplay guide</span>
                </li>
                <li>
                  <a href="#optional-rules" className="hover:text-gray-900 underline">Optional Game Rules</a>
                  <span className="text-gray-400"> — Variations like Challenge, bluffing, and more</span>
                </li>
              </ol>
            </nav>

            {/* Section 1: About */}
            <section id="about" className="mb-8 scroll-mt-4">
              <h2 className="text-2xl font-bold mb-4">About</h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                playfish.io was created in late 2025 to provide a simple way to play the classic card game Fish (also known as Canadian Fish, Russian Fish, or Literature) online. Fish is a simple game that only requires one deck of cards (easy to come across) and five<sup>*</sup> willing friends (harder to come across), but despite its simplicity it strains the brain in memory and thought, sort of like the children's game Go Fish but on steroids. This is probably what led it to gain popularity in high school competitive math circles, where it then trickled down into research, debate, and other places (this is my personal fictitious history of how this game spread, based purely on anectodal evidence).
              </p>
              <p className="text-sm text-gray-500 mt-4">
                *Four-player and eight-player games are possible but less common.
              </p>

              <blockquote className="mt-6 px-4 py-4 rounded-lg border-l-4 text-sm text-gray-700 leading-relaxed" style={{ backgroundColor: '#f8f5f0', borderColor: '#c9b99a' }}>
                <p>
                  It is uncertain where and when Literature was invented but the most likely place of origin on the basis of reports received so far is southern India - there are players in Tamil Nadu and in Kerala. There are also some reports of the game from North America, where some players know it as Fish, Canadian Fish or Russian Fish, presumably because of its relationship to the game Go Fish.
                </p>
                <p className="mt-3">
                  Sat Balaa from Chennai / Madras reports that his mother and aunt, who were born in the 1920's, played Literature during the 1940s and 50s with their father, who was a military doctor (Subedhar Rank) during the British Raj era and an avid player of this game. This implies that the game has been known in Tamil Nadu / Madras State since at least the 1940's.
                </p>
                <p className="mt-3">
                  Vinodh Rajaraman tells me that Literature is played in Madurai and Erode in Tamil Nadu, south India and Shandas C. and Vinod Poyilath report that it is played in several engineering college hostels in Kerala. Vinod Poyilath learned it from a professor named Manjith Kumar, who played it while studying at the Government Engineering College in Thrissur in the years 1986-1990. Brett Stevens learned the game from Ali Salahuddin, who was a masters student in math and MBA student at the University of Toronto from 1993-1995. Ali and his brother Umar learned it from their father who played while at Columbia University in the 1950's. He spent his formative years (1930-1940) in Kerala, India and may well have picked up the game there.
                </p>
                <footer className="mt-3 text-gray-500 text-xs">
                  — <a href="https://www.pagat.com/quartet/literature.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">John McLeod, pagat.com</a>
                </footer>
              </blockquote>
            </section>

            <hr className="my-8 border-gray-200" />

            {/* Section 2: Rules, Deeper Explained */}
            <section id="rules" className="scroll-mt-4">
              <h2 className="text-2xl font-bold mb-6">Rules, Deeper Explained</h2>

              <p className="text-gray-600 mb-6">
               Some rules relate to in-person play and are handled automatically online (marked in <span style={{ color: colors.blue }}>blue</span>).
              </p>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Overview</h3>
              <p>
                Fish is played by six or eight players in two teams (six is most common). Players sit in alternating order—each player sits between two opponents. Four 8's are removed from a standard 52-card deck, leaving 48 cards. These form eight <strong>half-suits</strong> (also called <strong>books</strong> or <strong>sets</strong>) of six cards each:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1">
                <li><strong>Low suits:</strong> 2, 3, 4, 5, 6, 7 of each suit</li>
                <li><strong>High suits:</strong> 9, 10, J, Q, K, A of each suit</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Objective</h3>
              <p>
                The objective is for your team to win more half-suits than the opposing team. With eight half-suits total, you need five to win outright. Ties at four each are possible.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Deal</h3>
              <p>
                The dealer shuffles and deals all cards out individually and face down. In a six-player game, each player receives 8 cards; in an eight-player game, 6 cards. Players look only at their own cards.
              </p>
              <p className="mt-3 px-4 py-2 rounded text-sm" style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                Dealing is handled automatically. Cards are distributed randomly.
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
                The game enforces valid questions—you can only select cards you're allowed to ask for.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Declarations (aka Claiming Books)</h3>
              <p>
                A player who collects all six cards of a half-suit (aka book) can simply lay them down to claim it for their team. More commonly, when the cards are split among teammates, a player can <strong>declare</strong> by stating exactly who holds each card.
              </p>
              <p className="mt-3">
                <strong>Example:</strong> "I declare Low Spades. I have the 4 and 2, Mary has the 3, and Joseph has the 5, 6, and 7."
              </p>
              <p className="mt-3">
                The players reveal their cards. If the declaration is completely correct, the declaring team wins the half-suit. If an opponent holds any of the cards, the opposing team wins it. If the declaring team has all the cards but the distribution was stated incorrectly, <strong style={{ color: colors.red }}>the half-suit is forfeited and neither team scores it</strong>.
              </p>
              <p className="mt-3">
                A player does not need to hold any cards from a half-suit to declare it—you can declare based purely on deduction from the game's questions.
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
                The game log shows the complete history of all questions, so the "last question only" rule doesn't apply. You cannot see your teammates' or opponents' card counts directly—you must track this yourself or deduce from the log.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Illegal Questions</h3>
              <p>
                Sometimes a player accidentally (or intentionally) asks an illegal question—for example, asking for a card from a half-suit they have no cards in, or asking a player who has no cards. How to handle this depends on when the violation is discovered:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2">
                <li><strong>Caught immediately:</strong> The question is simply retracted. The same player asks a valid question instead, and play continues normally.</li>
                <li><strong>Caught later (before the half-suit is declared):</strong> Most groups treat this as a penalty—the half-suit in question is awarded to the opposing team, since the illegal question may have unfairly influenced the game state.</li>
                <li><strong>Caught after the half-suit is declared:</strong> Generally, the declaration result stands. Once a half-suit has been claimed, it's too late to contest questions related to it.</li>
              </ul>
              <p className="mt-3 text-gray-600">
                House rules vary significantly here. Some groups are lenient and allow corrections anytime, while others enforce strict penalties. Agree on your group's policy before playing.
              </p>
              <p className="mt-3 px-4 py-2 rounded text-sm" style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                Illegal questions are prevented by the game—you can only select valid cards and opponents.
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
                When an entire team runs out of cards, the opposing team must declare all remaining half-suits. If it's the turn of someone on the team with cards, that player must make all remaining declarations alone (no consulting). If the turn belongs to the team with no cards, that player chooses which opponent must make the final declarations.
              </p>
            </section>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Strategy Tips</h3>
                <ul className="list-disc list-inside space-y-3">
                  <li>
                    <strong>Information is everything.</strong> Every question reveals information—both to your teammates and to your opponents. Good players reveal enough to help their team while minimizing what opponents learn.
                  </li>
                  <li>
                    <strong>Don't rush declarations.</strong> If you're confident your team has a complete half-suit but aren't 100% sure who has what, hold off. A wrong declaration gifts the half-suit to your opponents.
                  </li>
                  <li>
                    <strong>Stalemate breakers.</strong> If your team holds a complete half-suit and knows exactly where each card is, consider holding it in reserve. Later, if a teammate is stuck (knows where cards are but can't get the turn), you can declare the reserved half-suit and pass the turn to them.
                  </li>
                  <li>
                    <strong>Lock out dangerous opponents.</strong> If an opponent has accumulated cards and knowledge that threatens your team's half-suits, avoid asking them questions—don't give them the turn.
                  </li>
                  <li>
                    <strong>Track card counts.</strong> Knowing how many cards each player has helps narrow down possibilities and informs your declarations.
                  </li>
                </ul>
              </section>
            </section>

            <hr className="my-8 border-gray-200" />

            {/* Section 3: Optional Game Rules */}
            <section id="optional-rules" className="scroll-mt-4">
              <h2 className="text-2xl font-bold mb-6">Optional Game Rules</h2>

              <p className="text-gray-600 mb-6">
                Different groups play with various house rules and variations. Below are some of the most common optional rules you may encounter.
              </p>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Challenge</h3>
                <p>
                  At any time, a player may <strong>challenge</strong> the opposing team on a half-suit. The challenged team must then attempt to declare that half-suit immediately—they cannot consult each other.
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2">
                  <li>If everyone on the challenged team passes (refuses to declare), the challenger must attempt to name the location of all cards in that half-suit held by the opposing team</li>
                  <li>If the challenger is correct, their team wins the half-suit</li>
                  <li>If the challenger is wrong, the opposing team wins it</li>
                </ul>
                <p className="mt-3 text-gray-600">
                  This rule adds a bluffing element and prevents teams from indefinitely hoarding half-suits they've completed. It's particularly useful for breaking stalemates.
                </p>
                <p className="mt-3 px-4 py-2 rounded text-sm" style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                  Challenge mode is coming soon!.
                </p>
              </section>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Bluff Questions</h3>
                <p>
                  Some groups allow players to ask for cards they already hold. This can be used to mislead opponents about which cards you have, making deduction much harder.
                </p>
                <p className="mt-3 text-gray-600">
                  This variant significantly increases complexity and is not recommended for beginners. It makes the game considerably more confusing since opponents can no longer reliably deduce what cards you hold based on your questions.
                </p>
                <p className="mt-3 px-4 py-2 rounded text-sm" style={{ backgroundColor: `${colors.blue}15`, color: colors.blue }}>
                  Bluff questions are coming soon!.
                </p>
              </section>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Anytime Declarations</h3>
                <p>
                  In standard rules, you can only declare on your turn. Some groups allow declarations at any time, even when it's not your turn. After the declaration resolves, play continues with whoever's turn it was.
                </p>
                <p className="mt-3 text-gray-600">
                  This speeds up the game and allows teams to immediately capitalize on information before opponents can act on it.
                </p>
              </section>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Team Turn Declarations</h3>
                <p>
                  Some groups allow any player on the active team to declare during their team's turn—not just the player whose turn it is. This enables faster play and lets the teammate with the most information make the declaration.
                </p>
                <p className="mt-3 text-gray-600">
                  This is a middle ground between strict "your turn only" declarations and full anytime declarations.
                </p>
              </section>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Harsh Declarations</h3>
                <p>
                  In standard rules, if your team has all six cards but you state the wrong distribution, the half-suit is forfeited (neither team scores). With harsh declarations, <em>any</em> incorrect declaration—even a wrong distribution among teammates—awards the half-suit to the opposing team.
                </p>
                <p className="mt-3 text-gray-600">
                  This raises the stakes significantly and punishes guessing. Players must be absolutely certain before declaring.
                </p>
              </section>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Forced Declarations</h3>
                <p>
                  Some groups require players to declare a half-suit immediately if they collect all six cards in their own hand. This prevents players from secretly hoarding complete half-suits.
                </p>
              </section>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">High Half-Suits Score Double</h3>
                <p>
                  To add more weight to certain half-suits, some groups score high half-suits (9-A) as 2 points each while low half-suits (2-7) score 1 point. This makes ties less common and adds strategic considerations about which half-suits to prioritize.
                </p>
              </section>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Deck Variations</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Remove 7s instead of 8s:</strong> Low becomes A-6, high becomes 8-K. Functionally identical but some prefer this split.</li>
                  <li><strong>Add Jokers:</strong> With 54 cards (standard deck + 2 jokers), the four 8s plus two jokers form a ninth half-suit. This eliminates the possibility of ties.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Card Count Visibility</h3>
                <p>
                  In standard rules, players may ask how many cards anyone holds. Some groups hide this information entirely, or only allow asking if someone has <em>any</em> cards (not how many).
                </p>
              </section>
            </section>

            <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
              <p className="text-center text-gray-600 text-sm">
                Rules adapted from <a href="https://www.pagat.com/quartet/literature.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">John McLeod</a> and <a href="https://en.wikipedia.org/wiki/Literature_(card_game)" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">Wikipedia</a>.
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;
