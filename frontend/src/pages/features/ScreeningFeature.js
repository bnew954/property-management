import React from "react";
import FeaturePageTemplate from "./FeaturePageTemplate";
import featureMenuConfig from "./featureMenuConfig";

const feature = featureMenuConfig.find((item) => item.route === "/features/screening");

export default function ScreeningFeature() {
  return <FeaturePageTemplate feature={feature} />;
}
