---
title: Transfer learning for images with PyTorch
type: guide
hide_menu: true
tier: all
order: 30
meta_title: Computer Vision PyTorch Tutorial
meta_description: Label Studio tutorial for computer vision that showcases transfer learning for images using PyTorch and Label Studio.
section: "Machine learning"
parent: "ml_tutorials"
parent_enterprise: "ml_tutorials"
parent_page_extension: "html"
---


This example explains the basics of computer vision with Label Studio and [PyTorch](https://pytorch.org/).
The proposed model uses transfer learning from the popular ResNet image classifier and can be fine-tuned to your own data.

You can use this example labeling configuration:

```xml
<View>
  <Image name="image_object" value="$image_url"/>
  <Choices name="image_classes" toName="image_object">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
  </Choices>
</View>
```

### Create a model script

If you create an ML backend using [Label Studio's ML SDK](/guide/ml_create.html), make sure your ML backend script does the following:

- Inherit the created model class from `label_studio_ml.LabelStudioMLBase`
- Override the 2 methods:
    - `predict()`, which takes [input tasks](/guide/tasks.html#Basic-Label-Studio-JSON-format) and outputs [predictions](/guide/predictions.html) in the Label Studio JSON format.
    - `fit()`, which receives [annotations](/guide/export.html#Label-Studio-JSON-format-of-annotated-tasks) iterable and returns a dictionary with created links and resources. This dictionary is used later to load models with the `self.train_output` field.

Create a file `model.py` with the PyTorch model ready for training and inference.

First, create a `Dataset` class that takes a list of image URLs as input and produces a batch of preprocessed images with corresponding labels:

```python
import torch
import torch.nn as nn
import torch.optim as optim
import time

from torch.utils.data import Dataset, DataLoader
from torchvision import datasets, models, transforms

device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')


class ImageClassifierDataset(Dataset):
        
    def __init__(self, image_urls, image_classes):
        self.images = []
        self.labels = []
        
        self.classes = list(set(image_classes))
        self.class_to_label = {c: i for i, c in enumerate(self.classes)}
        
        self.image_size = 224
        self.transforms = transforms.Compose([
            transforms.Resize(self.image_size),
            transforms.CenterCrop(self.image_size),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        
        
        for image_url, image_class in zip(image_urls, image_classes):
            image = self._get_image_from_url(image_url)
            transformed_image = self.transforms(image)
            self.images.append(transformed_image)
            
            label = self.class_to_label[image_class]
            self.labels.append(label)
            
    def _get_image_from_url(self, url):
        pass
    
    def __getitem__(self, index):
        return self.images[index], self.labels[index]
    
    def __len__(self):
        return len(self.images)
```

Next, make a simple wrapper for the pretrained ResNet model:

```python
class ImageClassifier(object):
    
    def __init__(self, num_classes):
        self.model = models.resnet18(pretrained=True)
        num_ftrs = self.model.fc.in_features
        self.model.fc = nn.Linear(num_ftrs, num_classes)
        
        self.model = self.model.to(device)
        
        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = optim.SGD(self.model.parameters(), lr=0.001, momentum=0.9)
        
        # Decay LR by a factor of 0.1 every 7 epochs
        self.scheduler = optim.lr_scheduler.StepLR(self.optimizer, step_size=7, gamma=0.1)
    
    def save(self, path):
        torch.save(self.model.state_dict(), path)
    
    def load(self, path):
        self.model.load_state_dict(torch.load(path))
        self.model.eval()
        
    def train(self, dataloader, num_epochs=25):
        since = time.time()

        self.model.train()
        for epoch in range(num_epochs):
            print('Epoch {}/{}'.format(epoch, num_epochs - 1))
            print('-' * 10)
            
            running_loss = 0.0
            running_corrects = 0    
            # Iterate over data.
            for inputs, labels in dataloader:
                inputs = inputs.to(device)
                labels = labels.to(device)

                self.optimizer.zero_grad()
                outputs = self.model(inputs)
                _, preds = torch.max(outputs, 1)
                loss = self.criterion(outputs, labels)
                loss.backward()
                self.optimizer.step()

                # statistics
                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)
                self.scheduler.step()

            epoch_loss = running_loss / len(dataloader.dataset)
            epoch_acc = running_corrects.double() / len(dataloader.dataset)

            print('Train Loss: {:.4f} Acc: {:.4f}'.format(epoch_loss, epoch_acc))

        print()
    
        time_elapsed = time.time() - since
        print('Training complete in {:.0f}m {:.0f}s'.format(time_elapsed // 60, time_elapsed % 60))

        return self.model
```

Finally, override the API methods:

```python
from label_studio_ml.model import LabelStudioMLBase

class ImageClassifierAPI(LabelStudioMLBase):
    
    def __init__(self, **kwargs):
        self.model = ImageClassifier(resources['num_classes'])
        self.model.load(resources['model_path'])
        self.labels = resources['labels']
        
    def predict(self, tasks, **kwargs):
        pass

    def fit(self, completions, **kwargs):
        pass
```

### Create ML backend configs & scripts

Label Studio can automatically create all necessary configs and scripts needed to run ML backend from your newly created model.

Call your ML backend `my_backend` and from the command line, initialize the ML backend directory `./my_backend`:

```bash
label-studio-ml init my_backend
```

The last command takes your script `./model.py` and creates an `./my_backend` directory at the same level, copying the configs and scripts needed to launch the ML backend in either development or production modes.

!!! note 
    You can specify different location for your model script, for example: `label-studio-ml init my_backend --script /path/to/my/script.py`

### Launch ML backend server

#### Development mode

In development mode, training and inference are done in a single process, therefore the server doesn't respond to incoming prediction requests while the model trains.

To launch ML backend server in a Flask development mode, run the following from the command line:

```bash
label-studio-ml start my_backend
```

The server started on `http://localhost:9090` and outputs logs in console.

#### Production mode

Production mode is powered by a Redis server and RQ jobs that take care of background training processes. This means that you can start training your model and continue making requests for predictions from the current model state. 
After the model finishes the training process, the new model version updates automatically.

For production mode, please make sure you have Docker and docker-compose installed on your system. Then run the following from the command line:

```bash
cd my_backend/
docker-compose up
```

You can explore runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log`

### Using ML backend with Label Studio

Initialize and start a new Label Studio project connecting to the running ML backend:

```bash
label-studio start my_project --init --ml-backends http://localhost:9090
```

#### Getting predictions

You should see model predictions in a labeling interface. See [Set up machine learning with Label Studio](/guide/ml.html).

#### Model training

Trigger model training manually by pressing the `Start training` button the Machine Learning page of the project settings, or using an API call:

```bash
curl -X POST http://localhost:8080/api/models/train
```
