import React from 'react';
import BaseLayout from "../components/layouts/BaseLayout"
import AvatarVideoGenerator from '../components/comp-video-generation/AvatarVideoGenerator';
function VideoGeneratorPage () {
  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
          <AvatarVideoGenerator />
    </BaseLayout>
  );
};

export default VideoGeneratorPage;