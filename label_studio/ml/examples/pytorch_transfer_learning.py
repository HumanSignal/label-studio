import torch
import torch.nn as nn
import torch.optim as optim
import time
import os
import numpy as np
import requests
import io
import hashlib
import urllib

from PIL import Image
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms

from label_studio.ml import LabelStudioMLBase
from label_studio.ml.utils import get_single_tag_keys, get_choice, is_skipped


device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')


image_size = 224
image_transforms = transforms.Compose([
    transforms.Resize(image_size),
    transforms.CenterCrop(image_size),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])
image_cache_dir = os.path.join(os.path.dirname(__file__), 'image-cache')
os.makedirs(image_cache_dir, exist_ok=True)


def get_transformed_image(url):
    is_local_file = url.startswith('http://localhost:') and '/data/' in url
    if is_local_file:
        filename, dir_path = url.split('/data/')[1].split('?d=')
        dir_path = str(urllib.parse.unquote(dir_path))
        filepath = os.path.join(dir_path, filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(filepath)
        with open(filepath, mode='rb') as f:
            image = Image.open(f).convert('RGB')
    else:
        cached_file = os.path.join(image_cache_dir, hashlib.md5(url.encode()).hexdigest())
        if os.path.exists(cached_file):
            with open(cached_file, mode='rb') as f:
                image = Image.open(f).convert('RGB')
        else:
            r = requests.get(url, stream=True)
            r.raise_for_status()
            with io.BytesIO(r.content) as f:
                image = Image.open(f).convert('RGB')
            with io.open(cached_file, mode='wb') as fout:
                fout.write(r.content)
    return image_transforms(image)


class ImageClassifierDataset(Dataset):

    def __init__(self, image_urls, image_classes):
        self.classes = list(set(image_classes))
        self.class_to_label = {c: i for i, c in enumerate(self.classes)}

        self.images, self.labels = [], []
        for image_url, image_class in zip(image_urls, image_classes):
            try:
                image = get_transformed_image(image_url)
            except Exception as exc:
                print(exc)
                continue
            self.images.append(image)
            self.labels.append(self.class_to_label[image_class])

    def __getitem__(self, index):
        return self.images[index], self.labels[index]

    def __len__(self):
        return len(self.images)


class ImageClassifier(object):

    def __init__(self, num_classes, freeze_extractor=False):
        self.model = models.resnet18(pretrained=True)
        if freeze_extractor:
            print('Transfer learning with a fixed ConvNet feature extractor')
            for param in self.model.parameters():
                param.requires_grad = False
        else:
            print('Transfer learning with a full ConvNet finetuning')

        num_ftrs = self.model.fc.in_features
        self.model.fc = nn.Linear(num_ftrs, num_classes)

        self.model = self.model.to(device)

        self.criterion = nn.CrossEntropyLoss()
        if freeze_extractor:
            self.optimizer = optim.SGD(self.model.fc.parameters(), lr=0.001, momentum=0.9)
        else:
            self.optimizer = optim.SGD(self.model.parameters(), lr=0.001, momentum=0.9)

        self.scheduler = optim.lr_scheduler.StepLR(self.optimizer, step_size=7, gamma=0.1)

    def save(self, path):
        torch.save(self.model.state_dict(), path)

    def load(self, path):
        self.model.load_state_dict(torch.load(path))
        self.model.eval()

    def predict(self, image_urls):
        images = torch.stack([get_transformed_image(url) for url in image_urls])
        with torch.no_grad():
            return self.model(images).data.numpy()

    def train(self, dataloader, num_epochs=5):
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
                self.scheduler.step(epoch)

            epoch_loss = running_loss / len(dataloader.dataset)
            epoch_acc = running_corrects.double() / len(dataloader.dataset)

            print('Train Loss: {:.4f} Acc: {:.4f}'.format(epoch_loss, epoch_acc))

        print()

        time_elapsed = time.time() - since
        print('Training complete in {:.0f}m {:.0f}s'.format(time_elapsed // 60, time_elapsed % 60))

        return self.model


class ImageClassifierAPI(LabelStudioMLBase):

    def __init__(self, freeze_extractor=False, **kwargs):
        super(ImageClassifierAPI, self).__init__(**kwargs)
        self.from_name, self.to_name, self.value, self.classes = get_single_tag_keys(
            self.parsed_label_config, 'Choices', 'Image')
        self.freeze_extractor = freeze_extractor
        if self.train_output:
            self.classes = self.train_output['classes']
            self.model = ImageClassifier(len(self.classes), freeze_extractor)
            self.model.load(self.train_output['model_path'])
        else:
            self.model = ImageClassifier(len(self.classes), freeze_extractor)

    def reset_model(self):
        self.model = ImageClassifier(len(self.classes), self.freeze_extractor)

    def predict(self, tasks, **kwargs):
        image_urls = [task['data'][self.value] for task in tasks]
        logits = self.model.predict(image_urls)
        predicted_label_indices = np.argmax(logits, axis=1)
        predicted_scores = logits[np.arange(len(predicted_label_indices)), predicted_label_indices]
        predictions = []
        for idx, score in zip(predicted_label_indices, predicted_scores):
            predicted_label = self.classes[idx]
            # prediction result for the single task
            result = [{
                'from_name': self.from_name,
                'to_name': self.to_name,
                'type': 'choices',
                'value': {'choices': [predicted_label]}
            }]

            # expand predictions with their scores for all tasks
            predictions.append({'result': result, 'score': float(score)})

        return predictions

    def fit(self, completions, workdir=None, batch_size=32, num_epochs=10, **kwargs):
        image_urls, image_classes = [], []
        print('Collecting completions...')
        for completion in completions:
            if is_skipped(completion):
                continue
            image_urls.append(completion['data'][self.value])
            image_classes.append(get_choice(completion))

        print('Creating dataset...')
        dataset = ImageClassifierDataset(image_urls, image_classes)
        dataloader = DataLoader(dataset, shuffle=True, batch_size=batch_size)

        print('Train model...')
        self.reset_model()
        self.model.train(dataloader, num_epochs=num_epochs)

        print('Save model...')
        model_path = os.path.join(workdir, 'model.pt')
        self.model.save(model_path)

        return {'model_path': model_path, 'classes': dataset.classes}
