import BaseLayout from "../components/layouts/BaseLayout";
import CreatePodcastIntro from "../components/create-podcast/create-podcast-intro.jsx";
import RecentPodcasts from "../components/create-podcast/recent-podcasts.jsx";
import SamplePodcasts from "../components/create-podcast/sample-podcasts.jsx";

const CreatePodcastPage = () => {
  return (
    <BaseLayout>
      <main className="flex-1 overflow-y-auto p-8 md:p-10 space-y-12 bg-light">
        
        <section className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
          <CreatePodcastIntro />
        </section>

        <section className="border-t border-gray-300 pt-10">
          <RecentPodcasts />
        </section>

        <section className="border-t border-gray-300 pt-10">
          <SamplePodcasts />
        </section>
        
      </main>
    </BaseLayout>
  );
};

export default CreatePodcastPage;
