import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import SEO from '@/components/SEO';

const rulesStructuredData = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Play Fish Card Game",
  "description": "Complete rules and instructions for playing Fish, the classic team card game of deduction and strategy. Learn setup, gameplay, declarations, and winning strategies.",
  "totalTime": "PT30M",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": "0"
  },
  "supply": [
    {
      "@type": "HowToSupply",
      "name": "Standard 52-card deck with 8s removed (48 cards)"
    }
  ],
  "tool": [
    {
      "@type": "HowToTool",
      "name": "4, 6, or 8 players divided into two equal teams"
    }
  ],
  "step": [
    {
      "@type": "HowToStep",
      "name": "Set-Up",
      "text": "Divide players into two equal teams. Remove all 8s from a standard deck, leaving 48 cards forming eight half-suits (low: 2-7 and high: 9-A for each suit). Deal cards evenly among all players.",
      "position": 1
    },
    {
      "@type": "HowToStep",
      "name": "Gameplay",
      "text": "On your turn, ask an opponent for a specific card. You may only ask for a card from a half-suit you hold at least one card from, and you cannot ask for a card you already have. If they have it, they give it to you and you ask again. If not, they become the asker.",
      "position": 2
    },
    {
      "@type": "HowToStep",
      "name": "Making Declarations",
      "text": "When you believe your team holds all six cards of a half-suit and you know exactly who has each card, make a declaration. If correct, your team claims that half-suit. If incorrect, the opposing team claims it.",
      "position": 3
    },
    {
      "@type": "HowToStep",
      "name": "Winning",
      "text": "The team that successfully declares the most half-suits wins. With 8 half-suits total, you need at least 5 to win.",
      "position": 4
    }
  ]
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the difference between Fish and Go Fish?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Fish is a team-based strategy card game for 4-8 players where teams compete to collect half-suits through deduction. Go Fish is a simpler children's game where individual players collect sets of four. Fish requires strategic thinking, memory, and team coordination, while Go Fish is primarily luck-based."
      }
    },
    {
      "@type": "Question",
      "name": "How many players do you need to play Fish?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Fish requires an even number of players: 4, 6, or 8 players divided into two equal teams. The most common configuration is 6 players (3 per team)."
      }
    },
    {
      "@type": "Question",
      "name": "What cards are used in Fish?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Fish uses a standard 52-card deck with all four 8s removed, leaving 48 cards. These form eight 'half-suits': low cards (2, 3, 4, 5, 6, 7) and high cards (9, 10, J, Q, K, A) for each of the four suits."
      }
    },
    {
      "@type": "Question",
      "name": "What is an illegal question in Fish?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "An illegal question occurs when you ask for a card from a half-suit you don't hold any cards from, or when you ask for a card you already have in your hand."
      }
    },
    {
      "@type": "Question",
      "name": "Is Fish the same as Literature?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Fish is also known as Literature, Canadian Fish, or simply Lit. The rules are the same - it's a team-based card game of deduction where players try to collect half-suits."
      }
    }
  ]
};

const RulesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Rules of Fish - How to Play the Card Game"
        description="Learn how to play Fish, the classic team card game of deduction and strategy. Complete rules covering setup, gameplay, declarations, and winning. Not Go Fish!"
        canonical="/rules"
        type="article"
        structuredData={rulesStructuredData}
      />
      <SEO structuredData={faqStructuredData} />
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
