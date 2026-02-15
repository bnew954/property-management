import React from "react";
import FeaturePageTemplate from "./FeaturePageTemplate";
import featureMenuConfig from "./featureMenuConfig";

const feature = featureMenuConfig.find((item) => item.route === "/features/accounting");

export default function AccountingFeature() {
  return <FeaturePageTemplate feature={feature} />;
}
