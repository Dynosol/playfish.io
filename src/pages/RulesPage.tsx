import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import { colors } from '@/utils/colors';

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
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => navigate('/about')}
              className="flex items-center gap-2 hover:opacity-70 underline"
              style={{ color: colors.green }}
            >
              Tell me more
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <article className="prose prose-gray max-w-none">
            <h1 className="text-3xl font-bold mb-6">Rules of Fish</h1>

            <p className="text-lg text-gray-600 mb-8">
              Fish is a team card game for 4, 6, or 8 players. Two teams compete to claim the most half-suits through questions and deduction.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">The Deck</h2>
              <p>
                A standard deck with all 8s removed, leaving 48 cards. These form eight half-suits:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Low:</strong> 2, 3, 4, 5, 6, 7 of each suit</li>
                <li><strong>High:</strong> 9, 10, J, Q, K, A of each suit</li>
              </ul>
              <p className="mt-4">
                Cards are dealt evenly. Players sit alternating by team.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Taking a Turn</h2>
              <p>
                On your turn, ask any opponent for a specific card. Your question is valid only if:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You hold at least one card from that half-suit</li>
                <li>You do not already have the card you're asking for</li>
              </ul>
              <p className="mt-4">
                <strong>If they have it:</strong> They give it to you face-up. You ask again.
              </p>
              <p className="mt-4">
                <strong>If they don't:</strong> The turn passes to them.
              </p>
              <p className="mt-4 text-gray-600 italic">
                You may only ask opponents—never teammates.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Making a Declaration</h2>
              <p>
                When you believe your team holds all six cards of a half-suit, you may declare it on your turn. State exactly which teammate has which card.
              </p>
              <p className="mt-4">
                <strong>If correct:</strong> Your team claims that half-suit.
              </p>
              <p className="mt-4">
                <strong>If incorrect:</strong> The opposing team claims that half-suit—even if your team had all the cards but you named the wrong holder.
              </p>
              <p className="mt-4 font-medium" style={{ color: colors.red }}>
                Only declare when you are certain. A wrong guess hands the half-suit to your opponents.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Running Out of Cards</h2>
              <p>
                Players who lose all their cards cannot be asked questions, so the turn cannot pass to them.
              </p>
              <p className="mt-4">
                When one team has no cards left, the other team must declare all remaining half-suits without consulting each other.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Winning</h2>
              <p>
                The team that declares the most half-suits wins. With eight half-suits total, you need five to win outright. Ties at four each are possible.
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
