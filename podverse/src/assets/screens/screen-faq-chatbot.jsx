import React from 'react';
import BaseLayout from "../components/layouts/BaseLayout"
import FAQChatbot from '../components/comp-faq-chatbot/FAQChatbot';
function ScreenFAQ () {
  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
          <FAQChatbot />
    </BaseLayout>
  );
};

export default ScreenFAQ;