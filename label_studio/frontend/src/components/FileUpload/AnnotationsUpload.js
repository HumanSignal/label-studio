import React, {useState, useRef} from 'react';
import { cn } from '../../utils/bem';
import Swal from 'sweetalert2'
import getWebhookUrl from '../../webhooks';
import axios from 'axios';

export const AnnotationsUpload = ({
project
}) => {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const handleButtonClick = () => {
      fileInputRef.current.click();
    };
  
    const importAnnotations = async () => {
        const webhook_url = getWebhookUrl();
        await axios.get(webhook_url + "/export_options?id=" + project.id).then((response) => {
          console.log(response);
          if(response.data.options){
            const { value: option } = Swal.fire({
              title: 'Select an import option',
              input: 'select',
              inputOptions: response.data.options,
              inputPlaceholder: 'Select an option',
              showCancelButton: true,
              text: 'Your file should be compressed (zip, tar.xz, 7z) and should contain the annotations according to the format that you choose. The file structure should be the same as your input images (same folder structure with same file name). Annotations will be matched to the existing images.',
              inputValidator: (value) => {
                return new Promise(async (resolve) => {
                    console.log("value is ; " + response.data.options[value]);
                    setSelectedOption(response.data.options[value]);
                    console.log("selected option is: " + response.data.options[value])
                    if(value){
                        console.log("export data");
                        resolve();
                        handleButtonClick();
                        console.log(value);
                    }
                    else{
                        Swal.fire('Choose a type', 'Please choose a file type format to be able to upload the annotations', 'warning')
                    }
                })
              }
            })   
          }
          else{
            Swal.fire("Error", "Error retrieving options from the backend, please make sure that the webhook server is on", "error");
          }
    
        });
        console.log('Import Annotations')
      }

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
    formData.append('project_id', project.id);
      try {
        const response = await axios.post( webhook_url + `/import_annotations?id=${project.id}&format=${selectedOption}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        if (response.data.annotations.message){
          Swal.fire(
            {
              title: 'Warning', 
              text: response.data.annotations.message,
              icon: 'info'
            }
          )
        }
        else if (response.data.saved === false) {
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
  
    return (
      <form>
        <input
          type="file"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        <button type="button" onClick={() => importAnnotations()}>Upload Annotations</button>

      </form>
    );
  }