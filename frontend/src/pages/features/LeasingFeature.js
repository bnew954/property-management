import FeaturePageTemplate from "./FeaturePageTemplate";
import featureMenuConfig from "./featureMenuConfig";

const feature = featureMenuConfig.find((item) => item.route === "/features/leasing");

export default function LeasingFeature() {
  return <FeaturePageTemplate feature={feature} />;
}
