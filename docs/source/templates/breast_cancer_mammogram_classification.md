---
title: Breast Cancer Mammogram Classification
type: templates
category: Community Contributions
cat: community
order: 1000
meta_title: Breast Cancer Mammogram Classification Data Labeling Template
meta_description: Template for breast cancer mammogram classification with Label Studio
community: true
community_author: redeipirati
community_contributors: carly-bartel, luarmr
community_repo: awesome-label-studio-config
github_repo: humanSignal/awesome-label-studio-config
report_bug_url: https://github.com/humanSignal/awesome-label-studio-config/issues/new?template=bug_report.yml&config-name=breast-cancer-mammogram-classification&title=Bug%20in%20breast-cancer-mammogram-classification&body=I%20found%20a%20bug%20in%20the%20breast-cancer-mammogram-classification%20template.%0A%0A%23%23%20Steps%20to%20Reproduce%0A1.%20...%0A2.%20...%0A%0A%23%23%20Expected%20Behavior%0A...%0A%0A%23%23%20Actual%20Behavior%0A...%0A%0A%23%23%20Environment%0A-%20Label%20Studio%20Version:...%0A-%20Browser%20(if%20applicable):...%0A-%20Operating%20System:...%0A%0A%23%23%20Additional%20Context%0A...%0A
repo_url: https://github.com/HumanSignal/awesome-label-studio-config/tree/main/label-configs/breast-cancer-mammogram-classification
---


<img src="/images/templates/breast-cancer-mammogram-classification.jpg" alt="" class="gif-border" width="552px" height="408px" />

This labeling config provides a comprehensive interface for breast cancer mammogram analysis using the BI-RADS classification system. It enables radiologists to classify mammograms, assess breast density, and document findings for both breasts.

## Labeling Configuration

```html
<View>
  <Style>
    .mammogram-container {
      padding: var(--spacing-600);
      box-shadow: 0 2px 8px rgba(var(--color-neutral-shadow-raw) / 0.15);
      border-radius: var(--corner-radius-medium);
      margin-bottom: var(--spacing-800);
    }
    
    .mammogram-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      grid-template-areas: 
        'left-cc right-cc'
        'left-mlo right-mlo';
      gap: var(--spacing-600);
      margin: var(--spacing-600) 0;
      max-width: 1000px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .mammogram-view {
      text-align: center;
      border: 2px solid var(--color-neutral-border);
      border-radius: var(--corner-radius-medium);
      padding: var(--spacing-500);
      background: var(--color-neutral-background);
      transition: border-color 0.3s ease;
      min-height: 480px;
      display: flex;
      flex-direction: column;
    }
    
    .mammogram-view:hover {
      border-color: var(--color-primary-border-subtle);
    }
    
    .left-cc { grid-area: left-cc; }
    .right-cc { grid-area: right-cc; }
    .left-mlo { grid-area: left-mlo; }
    .right-mlo { grid-area: right-mlo; }
    
    .mammogram-image {
      width: 100%;
      height: 400px;
      object-fit: contain;
      border-radius: var(--corner-radius-small);
      background: var(--color-neutral-background);
    }
    
    .view-header {
      font-size: var(--font-size-16);
      font-weight: var(--font-weight-semibold);
      color: var(--color-neutral-content);
      margin-bottom: var(--spacing-300);
      padding: var(--spacing-200) var(--spacing-300);
      background: var(--color-neutral-surface);
      border: 1px solid var(--color-neutral-border-subtle);
      border-radius: var(--corner-radius-small);
      text-align: center;
    }
    
    .instructions {
      background: var(--color-primary-background);
      padding: var(--spacing-500);
      border-radius: var(--corner-radius-medium);
      border-left: 4px solid var(--color-primary-border);
      margin-bottom: var(--spacing-600);
      line-height: var(--line-height-body-medium);
    }
    
    .instructions-header {
      font-size: var(--font-size-16);
      margin-bottom: var(--spacing-400);
      line-height: var(--line-height-body-medium);
      color: var(--color-neutral-content);
    }
    
    .birads-legend {
      background: var(--color-warning-background);
      color: var(--color-warning-content);
      padding: var(--spacing-400);
      border-radius: var(--corner-radius-small);
      border: 1px solid var(--color-warning-border-subtler);
      margin-top: var(--spacing-400);
      font-size: var(--font-size-14);
      line-height: var(--line-height-body-small);
    }
    
    .classification-section {
      background: var(--color-neutral-background);
      color: var(--color-neutral-content);
      padding: var(--spacing-600);
      border-radius: var(--corner-radius-medium);
      box-shadow: 0 2px 4px rgba(var(--color-neutral-shadow-raw) / 0.1);
      margin: var(--spacing-500) 0;
      border: 1px solid var(--color-neutral-border-subtle);
    }
  </Style>

  <!-- Header for context -->
  <Header value="Breast Cancer Mammogram Classification" style="text-align: center; font-size: var(--font-size-24); color: var(--color-neutral-content); margin-bottom: var(--spacing-500);" />

  <!-- Instructions -->
  <View className="instructions">
    <Header value="Please review the standard mammographic views (CC and MLO) of both breasts. Compare corresponding views (e.g., L-CC with R-CC). Label each breast individually, and report any findings." style="font-size: 16px; margin-bottom: 10px; height:auto;" />
    <View className="birads-legend">
      <Text name="birads_legend" value="BI-RADS: 0 = Incomplete, 1 = Negative, 2 = Benign, 3 = Probably Benign, 4 = Suspicious, 5 = Highly Suggestive of Malignancy, 6 = Known Cancer" />
    </View>
  </View>

  <!-- Mammogram Views Grid -->
  <View className="mammogram-container">
    <View className="mammogram-grid">
      <!-- Left CC -->
      <View className="mammogram-view left-cc">
        <Header value="Left CC" className="view-header" />
        <Image name="left_cc" value="$img1" className="mammogram-image" />
      </View>
      
      <!-- Right CC -->
      <View className="mammogram-view right-cc">
        <Header value="Right CC" className="view-header" />
        <Image name="right_cc" value="$img3" className="mammogram-image" />
      </View>
      
      <!-- Left MLO -->
      <View className="mammogram-view left-mlo">
        <Header value="Left MLO" className="view-header" />
        <Image name="left_mlo" value="$img2" className="mammogram-image" />
      </View>
      
      <!-- Right MLO -->
      <View className="mammogram-view right-mlo">
        <Header value="Right MLO" className="view-header" />
        <Image name="right_mlo" value="$img4" className="mammogram-image" />
      </View>
    </View>
  </View>

  <!-- Left Breast Classification -->
  <View className="classification-section">
    <Header value="Left Breast: BI-RADS Classification" style="font-size: var(--font-size-20); color: var(--color-neutral-content); margin-bottom: var(--spacing-400);" />
    <Choices name="birads_left" toName="left_cc,right_cc,left_mlo,right_mlo" choice="single" required="true">
      <Choice value="0 - Incomplete" />
      <Choice value="1 - Negative" />
      <Choice value="2 - Benign" />
      <Choice value="3 - Probably Benign" />
      <Choice value="4 - Suspicious Abnormality" />
      <Choice value="5 - Highly Suggestive of Malignancy" />
      <Choice value="6 - Known Biopsy-Proven Malignancy" />
    </Choices>

    <Header value="Left Breast: Density" style="font-size: var(--font-size-16); color: var(--color-neutral-content-subtle); margin: var(--spacing-500) 0 var(--spacing-200) 0;" />
    <Choices name="density_left" toName="left_cc,right_cc,left_mlo,right_mlo" choice="single">
      <Choice value="A - Almost entirely fatty" />
      <Choice value="B - Scattered fibroglandular densities" />
      <Choice value="C - Heterogeneously dense" />
      <Choice value="D - Extremely dense" />
    </Choices>

    <Header value="Left Breast: Findings (Optional)" style="font-size: var(--font-size-16); color: var(--color-neutral-content-subtle); margin: var(--spacing-500) 0 var(--spacing-200) 0;" />
    <Choices name="findings_left" toName="left_cc,right_cc,left_mlo,right_mlo" choice="multiple">
      <Choice value="Mass" />
      <Choice value="Calcifications" />
      <Choice value="Architectural Distortion" />
      <Choice value="Asymmetry" />
      <Choice value="Skin/Nipple Retraction" />
    </Choices>
  </View>

  <!-- Right Breast Classification -->
  <View className="classification-section">
    <Header value="Right Breast: BI-RADS Classification" style="font-size: var(--font-size-20); color: var(--color-neutral-content); margin-bottom: var(--spacing-400);" />
    <Choices name="birads_right" toName="left_cc,right_cc,left_mlo,right_mlo" choice="single" required="true">
      <Choice value="0 - Incomplete" />
      <Choice value="1 - Negative" />
      <Choice value="2 - Benign" />
      <Choice value="3 - Probably Benign" />
      <Choice value="4 - Suspicious Abnormality" />
      <Choice value="5 - Highly Suggestive of Malignancy" />
      <Choice value="6 - Known Biopsy-Proven Malignancy" />
    </Choices>

    <Header value="Right Breast: Density" style="font-size: var(--font-size-16); color: var(--color-neutral-content-subtle); margin: var(--spacing-500) 0 var(--spacing-200) 0;" />
    <Choices name="density_right" toName="left_cc,right_cc,left_mlo,right_mlo" choice="single">
      <Choice value="A - Almost entirely fatty" />
      <Choice value="B - Scattered fibroglandular densities" />
      <Choice value="C - Heterogeneously dense" />
      <Choice value="D - Extremely dense" />
    </Choices>

    <Header value="Right Breast: Findings (Optional)" style="font-size: var(--font-size-16); color: var(--color-neutral-content-subtle); margin: var(--spacing-500) 0 var(--spacing-200) 0;" />
    <Choices name="findings_right" toName="left_cc,right_cc,left_mlo,right_mlo" choice="multiple">
      <Choice value="Mass" />
      <Choice value="Calcifications" />
      <Choice value="Architectural Distortion" />
      <Choice value="Asymmetry" />
      <Choice value="Skin/Nipple Retraction" />
    </Choices>
  </View>

  <!-- Additional Observations -->
  <View className="classification-section">
    <Header value="Additional Observations / Notes (Optional)" style="font-size: var(--font-size-20); color: var(--color-neutral-content); margin-bottom: var(--spacing-400);" />
    <TextArea
      name="notes"
      toName="left_cc,right_cc,left_mlo,right_mlo"
      rows="5"
      placeholder="Describe any notable findings, technical issues, or comparison to prior exams."
      style="width: 100%; padding: var(--spacing-300); border: 2px solid var(--color-neutral-border); border-radius: var(--corner-radius-small); font-size: var(--font-size-14); background: var(--color-neutral-background); color: var(--color-neutral-content);"
    />
  </View>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

This configuration uses the following tags:

- [Image](/tags/image.html)
- [Choices](/tags/choices.html)
- [TextArea](/tags/textarea.html)
- [Header](/tags/header.html)
- [Style](/tags/style.html)

## Usage Instructions

- **Image Display**: This config displays four mammogram views (Left CC, Left MLO, Right CC, Right MLO) in a grid layout.
- **BI-RADS Classification**: Each breast can be classified using the standard BI-RADS categories (0-6).
- **Density Assessment**: Breast density can be classified using the A-D scale.
- **Findings Documentation**: Multiple choice options for common findings (Mass, Calcifications, etc.).
- **Notes**: Free text area for additional observations and technical notes.

