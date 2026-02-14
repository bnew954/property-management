import FeaturePageTemplate from "./FeaturePageTemplate";
import featureMenuConfig from "./featureMenuConfig";

const feature = featureMenuConfig.find((item) => item.route === "/features/payments");

export default function PaymentsFeature() {
  return <FeaturePageTemplate feature={feature} />;
}
