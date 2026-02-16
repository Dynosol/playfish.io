import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { colors } from '@/utils/colors';
import { useAuth } from '@/contexts/AuthContext';
import { callSubmitFeedback } from '@/firebase/functionsClient';
import { logPageView, logFeedbackSubmitted } from '@/firebase/analytics';

const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => { logPageView('Feedback'); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be signed in to submit feedback');
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError('Please enter your feedback');
      return;
    }

    if (trimmedMessage.length > 2000) {
      setError('Feedback must be 2000 characters or less');
      return;
    }

    setSubmitting(true);

    try {
      await callSubmitFeedback({ message: trimmedMessage });
      logFeedbackSubmitted(trimmedMessage.length);
      setSuccess(true);
      setMessage('');
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Submit Feedback"
        description="Share your feedback about PlayFish.io"
        canonical="/feedback"
        noindex={true}
      />
      <Header type="home" />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-xl">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <h1 className="text-2xl font-bold mb-4">Submit Feedback</h1>

          {success ? (
            <div
              className="p-4 rounded-lg mb-4"
              style={{ backgroundColor: colors.green, color: 'white' }}
            >
              Thank you for your feedback! We appreciate you taking the time to help us improve.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <textarea
                  id="feedback"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 resize-none"
                  rows={6}
                  placeholder="Found a bug? Want a feature added? Just want to say hi? Use this box for whatever you need..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={submitting}
                  maxLength={2000}
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {message.length}/2000
                </div>
              </div>

              {error && (
                <div
                  className="p-3 rounded-lg mb-4 text-sm"
                  style={{ backgroundColor: colors.red, color: 'white' }}
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full rounded text-white"
                style={{ backgroundColor: submitting ? colors.grayMedium : colors.purple }}
                disabled={submitting || !message.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit message'}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default FeedbackPage;
