import FeaturePageTemplate from "./FeaturePageTemplate";
import featureMenuConfig from "./featureMenuConfig";

const feature = featureMenuConfig.find((item) => item.route === "/features/maintenance");

export default function MaintenanceFeature() {
  return <FeaturePageTemplate feature={feature} />;
}
