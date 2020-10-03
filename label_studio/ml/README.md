## Quickstart

Here is a quick example tutorial on how to run the ML backend with a simple text classifier:

0. Clone repo
   ```bash
   git clone https://github.com/heartexlabs/label-studio  
   ```
   
1. Setup environment
   ```bash
   cd label-studio
   pip install -e .
   cd label_studio/ml/examples
   pip install -r requirements.txt
   ```
   
2. Create new ML backend
   ```bash
   label-studio-ml init my_ml_backend --script label-studio/ml/examples/simple_text_classifier.py
   ```
   
3. Start ML backend server
   ```bash
   label-studio-ml start my_ml_backend
   ```
   
4. Run Label Studio connecting it to the running ML backend:
    ```bash
    label-studio start text_classification_project --init --template text_sentiment --ml-backends http://localhost:9090
    ```

## Create your own ML backend

Check examples in `label-studio/ml/examples` directory.