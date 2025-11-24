import { useState, useEffect, useCallback } from 'react';
import { Check, Crown, Zap, Clock, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BaseLayout from "../components/layouts/BaseLayout";
import { getSupabaseAuthorizedtoken } from '../supabaseClient';

const SubscriptionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState({
    status: 'none',
    plan: 'free',
    is_active: false,
    current_period_end: null,
  });
  const [authToken, setAuthToken] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const ensureAuthToken = useCallback(async () => {
    if (!user) return null;
    if (authToken) return authToken;

    const token = await getSupabaseAuthorizedtoken();
    setAuthToken(token);
    return token;
  }, [user, authToken]);

  const checkSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const token = await ensureAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/subscription/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to fetch subscription status');
      }
      console.log('📊 Subscription status:', data); // Debug log
      setSubscription(data);
      setStatusMessage(null);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatusMessage('Unable to load subscription status. Please try again.');
      setSubscription({
        status: 'none',
        plan: 'free',
        is_active: false,
        current_period_end: null,
      });
    }
  }, [user, API_BASE_URL, ensureAuthToken]);

  useEffect(() => {
    // Redirect to sign in if not authenticated
    if (!user) {
      navigate('/signin-email');
      return;
    }

    // Check current subscription status
    checkSubscription();

    // Refresh subscription when page becomes visible (e.g., returning from Stripe checkout)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkSubscription);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkSubscription);
    };
  }, [user, navigate, checkSubscription]);

  const handleSubscribe = async (planType) => {
    if (!user) {
      navigate('/signin-email');
      return;
    }

    setLoading(true);
    try {
      const token = await ensureAuthToken();
      if (!token) throw new Error('Missing auth token');

      const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planType })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'Unable to start checkout session');
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      navigate('/signin-email');
      return;
    }

    setLoading(true);
    try {
      const token = await ensureAuthToken();
      if (!token) throw new Error('Missing auth token');

      const response = await fetch(`${API_BASE_URL}/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'Unable to open billing portal');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      alert(error.message || 'Failed to open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: 'PKR 0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        '2 Avatar Templates (2 for Speaker A, 2 for Speaker B)',
        '10 Podcast Generations',
      ],
      buttonText: 'Current Plan',
      buttonVariant: 'outline',
      popular: false,
      planType: 'free'
    },
    {
      name: 'Pro',
      price: 'PKR 10,000',
      period: 'month',
      description: 'For serious podcasters',
      features: [
        'All Avatar Templates (Unlimited)',
        '100 Podcast Generations',
      ],
      buttonText: 'Subscribe Now',
      buttonVariant: 'primary',
      popular: true,
      planType: 'pro'
    },
    {
      name: 'Enterprise',
      price: 'PKR 100,000',
      period: 'month',
      description: 'For teams and organizations',
      features: [
        'All Avatar Templates (Unlimited)',
        'Unlimited Podcast Generations',
        'API access',
      ],
      buttonText: 'Subscribe Now',
      buttonVariant: 'outline',
      popular: false,
      planType: 'enterprise'
    }
  ];

  const renderPlanButtonLabel = (plan) => {
    if (loading) return 'Loading...';

    // Priority 1: Show "Current Plan" for the active subscription plan (pro/enterprise)
    if (subscription.is_active && plan.planType === subscription.plan) {
      return 'Current Plan';
    }

    // Priority 2: Show "Current Plan" for free ONLY if:
    // - No subscription exists (status === 'none'), OR
    // - Subscription exists but is not active AND plan is free
    if (plan.planType === 'free') {
      if (subscription.status === 'none') {
        return 'Current Plan';
      }
      if (!subscription.is_active && subscription.plan === 'free') {
        return 'Current Plan';
      }
      // If user has active pro/enterprise, free should NOT show "Current Plan"
      return 'Downgrade to Free';
    }

    // Priority 3: Show resume option for canceled/past_due subscriptions
    if (subscription.status !== 'none' && plan.planType === subscription.plan && !subscription.is_active) {
      return `Resume ${plan.name}`;
    }

    return plan.buttonText;
  };

  const shouldDisablePlanButton = (plan) => {
    // Disable free plan button (can't subscribe to free, it's the default)
    if (plan.planType === 'free') return true;

    // Disable while loading
    if (loading) return true;

    // Disable if this is the current active plan (user already has this plan)
    if (subscription.is_active && plan.planType === subscription.plan) return true;

    return false;
  };

  const formatPeriodEnd = (value) => {
    if (!value) return null;
    return new Date(value).toLocaleDateString();
  };

  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Crown size={16} />
              <span>Upgrade Your Podcasting Experience</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Unlock unlimited creativity with AI-powered podcasting tools.
              Start free or upgrade for full access.
            </p>
          </div>

          {/* Current Subscription Status */}
          {subscription.status !== 'none' && (
            <div className="max-w-2xl mx-auto mb-8 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Check size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {subscription.is_active ? 'Active Subscription' : `Status: ${subscription.status}`}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">
                    Plan: {subscription.plan} {subscription.current_period_end && `(renews ${formatPeriodEnd(subscription.current_period_end)})`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={loading || !subscription.stripe_subscription_id}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Manage Billing
              </button>
            </div>
          )}

          {statusMessage && (
            <div className="max-w-2xl mx-auto mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              {statusMessage}
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan, index) => {
              const isCurrentPlan = subscription.is_active && plan.planType === subscription.plan;
              const isFreeCurrent = plan.planType === 'free' && (subscription.status === 'none' || (!subscription.is_active && subscription.plan === 'free'));
              const showCurrentBadge = isCurrentPlan || isFreeCurrent;

              return (
                <div
                  key={index}
                  className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${plan.popular && !showCurrentBadge ? 'ring-2 ring-purple-500 transform scale-105' : ''
                    } ${showCurrentBadge ? 'ring-2 ring-green-500 border-green-500' : ''
                    }`}
                >
                  {showCurrentBadge && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-600 to-green-500 text-white text-center py-2 text-sm font-semibold z-10">
                      ✓ Current Plan
                    </div>
                  )}
                  {plan.popular && !showCurrentBadge && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-2 text-sm font-semibold">
                      Most Popular
                    </div>
                  )}

                  <div className={`p-8 ${(plan.popular || showCurrentBadge) ? 'pt-12' : ''}`}>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                    <div className="mb-6">
                      <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600 ml-2">/ {plan.period}</span>
                    </div>

                    <button
                      onClick={() => plan.planType && handleSubscribe(plan.planType)}
                      disabled={shouldDisablePlanButton(plan)}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${plan.buttonVariant === 'primary'
                        ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-500 hover:text-purple-600'
                        }`}
                    >
                      {renderPlanButtonLabel(plan)}
                    </button>

                    <ul className="mt-8 space-y-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Features Highlight */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Why Upgrade to Pro?
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Zap,
                  title: 'Unlimited AI Power',
                  description: 'Generate unlimited content with AI hosts and guests'
                },
                {
                  icon: Clock,
                  title: 'Save Time',
                  description: 'Automate your workflow and publish faster'
                },
                {
                  icon: Shield,
                  title: 'Priority Support',
                  description: 'Get help when you need it from our expert team'
                },
                {
                  icon: Sparkles,
                  title: 'Premium Quality',
                  description: 'Export in HD with advanced editing tools'
                }
              ].map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon size={32} className="text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default SubscriptionPage;