import FeaturePageTemplate from "./FeaturePageTemplate";
import featureMenuConfig from "./featureMenuConfig";

const feature = featureMenuConfig.find((item) => item.route === "/features/listings");

export default function TenantsFeature() {
  return <FeaturePageTemplate feature={feature} />;
}
