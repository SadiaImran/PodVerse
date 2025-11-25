import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from "../components/layouts/BaseLayout";
import { getSupabaseAuthorizedtoken } from '../supabaseClient';
import { Star, MessageSquare, Mic, Brain, Send, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

function ScreenPodcastFeedback() {
  const navigate = useNavigate();

  // Rating states
  const [conversationRating, setConversationRating] = useState(0);
  const [voiceRating, setVoiceRating] = useState(0);
  const [aiRating, setAiRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);

  // Feedback text states
  const [conversationFeedback, setConversationFeedback] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [generalFeedback, setGeneralFeedback] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = await getSupabaseAuthorizedtoken();
      const feedbackData = {
        conversation_skills_rating: conversationRating || null,
        voice_clarity_rating: voiceRating || null,
        ai_accuracy_rating: aiRating || null,
        overall_rating: overallRating || null,
        conversation_skills_feedback: conversationFeedback || null,
        voice_clarity_feedback: voiceFeedback || null,
        ai_accuracy_feedback: aiFeedback || null,
        general_feedback: generalFeedback || null,
      };

      await axios.post(
        `${API_BASE_URL}/video/feedback/`,
        feedbackData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSubmitted(true);
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.response?.data?.detail || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ rating, setRating, label, icon: Icon }) => {
    const [hover, setHover] = useState(0);

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-light-purple" />
          <label className="font-headingPoppins text-light-grey font-medium">
            {label}
          </label>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hover || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                } transition-colors`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-light-grey self-center">
              {rating} / 5
            </span>
          )}
        </div>
      </div>
    );
  };

  if (submitted) {
    return (
      <BaseLayout homeScreen={false} autoCollapse={true}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold font-headingPoppins text-light-purple">
              Thank You!
            </h2>
            <p className="text-light-grey font-headingPoppins">
              Your feedback has been submitted successfully.
            </p>
            <p className="text-sm text-light-grey">Redirecting to home...</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
      <div className="w-full h-full p-4 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-headingPoppins text-light-purple tracking-wide">
            Podcast Feedback
          </h1>
          <p className="font-headingPoppins tracking-wider text-light-grey text-base">
            Share your experience and help us improve
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Conversation Skills */}
              <div className="border-2 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <StarRating
                  rating={conversationRating}
                  setRating={setConversationRating}
                  label="Conversation Skills"
                  icon={MessageSquare}
                />
                <textarea
                  value={conversationFeedback}
                  onChange={(e) => setConversationFeedback(e.target.value)}
                  placeholder="Share your thoughts on the conversation flow, engagement, and communication..."
                  className="mt-4 w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-light-purple font-headingPoppins text-sm"
                  rows="3"
                />
              </div>

              {/* Voice Clarity */}
              <div className="border-2 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <StarRating
                  rating={voiceRating}
                  setRating={setVoiceRating}
                  label="Voice Clarity"
                  icon={Mic}
                />
                <textarea
                  value={voiceFeedback}
                  onChange={(e) => setVoiceFeedback(e.target.value)}
                  placeholder="Comment on audio quality, pronunciation, and voice naturalness..."
                  className="mt-4 w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-light-purple font-headingPoppins text-sm"
                  rows="3"
                />
              </div>

              {/* AI Accuracy */}
              <div className="border-2 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <StarRating
                  rating={aiRating}
                  setRating={setAiRating}
                  label="AI Accuracy"
                  icon={Brain}
                />
                <textarea
                  value={aiFeedback}
                  onChange={(e) => setAiFeedback(e.target.value)}
                  placeholder="How well did the AI understand and respond to your content..."
                  className="mt-4 w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-light-purple font-headingPoppins text-sm"
                  rows="3"
                />
              </div>

              {/* Overall Experience */}
              <div className="border-2 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <StarRating
                  rating={overallRating}
                  setRating={setOverallRating}
                  label="Overall Experience"
                  icon={Star}
                />
                <textarea
                  value={generalFeedback}
                  onChange={(e) => setGeneralFeedback(e.target.value)}
                  placeholder="Any additional thoughts or suggestions for improvement..."
                  className="mt-4 w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-light-purple font-headingPoppins text-sm"
                  rows="3"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-headingPoppins text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border-2 border-light-purple text-light-purple rounded-lg font-headingPoppins font-medium hover:bg-light-purple hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-light-purple text-white rounded-lg font-headingPoppins font-medium hover:bg-opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BaseLayout>
  );
}

export default ScreenPodcastFeedback;