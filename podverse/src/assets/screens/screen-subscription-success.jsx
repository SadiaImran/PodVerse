import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BaseLayout from "../components/layouts/BaseLayout";
import { getSupabaseAuthorizedtoken } from '../supabaseClient';

const SubscriptionSuccessPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    const [loading, setLoading] = useState(true);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState(null);
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
        // Redirect to sign in if not authenticated
        if (!user) {
            navigate('/signin-email');
            return;
        }

        // If no session_id, still show success (webhook may have processed it)
        if (!sessionId) {
            setLoading(false);
            setVerified(true);
            checkSubscriptionStatus();
            return;
        }

        // Verify the session and check subscription status
        verifySession();
    }, [user, sessionId, navigate]);

    const verifySession = async () => {
        try {
            const token = await getSupabaseAuthorizedtoken();
            if (!token) {
                setError('Authentication required');
                setLoading(false);
                return;
            }

            // If we have a session_id, verify it with Stripe
            if (sessionId) {
                const verifyResponse = await fetch(`${API_BASE_URL}/subscription/verify-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ session_id: sessionId })
                });

                if (verifyResponse.ok) {
                    const verifyData = await verifyResponse.json();
                    if (verifyData.verified) {
                        console.log('✅ Session verified, subscription synced');
                    }
                }
            }

            // Check subscription status (webhook should have processed it by now, or we just synced it)
            await checkSubscriptionStatus();

            setVerified(true);
            setLoading(false);
        } catch (err) {
            console.error('Error verifying session:', err);
            setError('Failed to verify subscription. Please check your subscription status.');
            setLoading(false);
            setVerified(true); // Still show success UI, let user check manually
        }
    };

    const checkSubscriptionStatus = async () => {
        try {
            const token = await getSupabaseAuthorizedtoken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/subscription/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSubscription(data);
            }
        } catch (err) {
            console.error('Error checking subscription status:', err);
        }
    };

    return (
        <BaseLayout homeScreen={false} autoCollapse={true}>
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center">
                        {loading ? (
                            <>
                                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Loader2 size={40} className="text-purple-600 animate-spin" />
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                    Processing Your Subscription
                                </h1>
                                <p className="text-gray-600">
                                    Please wait while we verify your payment...
                                </p>
                            </>
                        ) : verified ? (
                            <>
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={60} className="text-green-600" />
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                    Subscription Successful!
                                </h1>
                                <p className="text-lg text-gray-600 mb-6">
                                    Thank you for subscribing. Your account has been upgraded.
                                </p>

                                {subscription && subscription.is_active && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold">Plan:</span> {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                                        </p>
                                        {subscription.current_period_end && (
                                            <p className="text-sm text-gray-700 mt-1">
                                                <span className="font-semibold">Renews:</span>{' '}
                                                {new Date(subscription.current_period_end).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                        <p className="text-sm text-yellow-800">{error}</p>
                                        <p className="text-sm text-yellow-700 mt-2">
                                            Don't worry - if payment was successful, your subscription will be activated shortly.
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <button
                                        onClick={() => navigate('/subscription')}
                                        className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                                    >
                                        View Subscription
                                    </button>
                                    <button
                                        onClick={() => navigate('/home')}
                                        className="px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:border-purple-500 hover:text-purple-600 transition-colors"
                                    >
                                        Go to Home
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Loader2 size={40} className="text-yellow-600" />
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                    Verifying Payment
                                </h1>
                                <p className="text-gray-600">
                                    Please wait...
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default SubscriptionSuccessPage;

