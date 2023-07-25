import React, {useState, useRef} from 'react';
import { cn } from '../../utils/bem';
import Swal from 'sweetalert2'
import getWebhookUrl from '../../webhooks';
import axios from 'axios';

export const FileUpload = ({
project
}) => {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleButtonClick = () => {
      fileInputRef.current.click();
    };
  
  function handleFileSelect(event) {
    if (event.target.files[0].name === selectedFile?.name) {
      Swal.fire({
        title: 'Error',
        text: "You are trying to upload the same file",
        icon: 'warning',
      }).then((result) => {
      })
      }
      handleSubmit(event.target.files[0]);
      setSelectedFile(event.target.files[0]);
      fileInputRef.current.value = '';
    };
  

  async function handleSubmit(file) {
    const webhook_url = getWebhookUrl();
    const formData = new FormData();
    Swal.fire({
      title: 'Uploading',
      text: "Your file is being uploaded, please wait a bit",
      icon: 'info',
    })
    formData.append('file', file);
    formData.append('project_id', project.id)
      try {
        const response = await axios.post( webhook_url + `/upload_images?id=${project.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
    
        if (response.data.saved === false) {
          Swal.fire({
            title: 'Error',
            text: "This file is already in the project directory. If you wish to upload it again, please change its name",
            icon: 'warning',
          })
        }
        else {
          Swal.fire({
            title: 'Success',
            text: "Your file has been uploaded, refresh the page to see it",
            icon: 'success',
          })
        }
      } catch (error) {
          Swal.fire({
            title: 'Error',
            text: "Failed to upload the file, please try again later",
            icon: 'warning',
          }).then((result) => {
          })
        }      
  }
  
    const importImages = () => {  
      console.log('Import Images');
      Swal.fire({
        title: 'Attention',
        text: "Please choose an image or a compressed file (zip, tar.xz, 7z) that contains multiple images to be imported (The compressed file can support subfolder structure).",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Upload Images'
      }).then((result) => {
        if (result.isConfirmed) {
          handleButtonClick();
        }
      })
    }
    return (
      <form>
        <input
          type="file"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        <button type="button" onClick={importImages}>Upload Images</button>

      </form>
    );
  }