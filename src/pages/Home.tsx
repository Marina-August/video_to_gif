import Footer from "../components/Footer";
import classes from './Home.module.css'
import { Link } from 'react-router-dom'; 
import { useRef, useState, useEffect } from "react";
import { UPLOAD_FOLDER, S3_BUCKET, MAX_FILE_SIZE, AWS_REGION, VIDEO_LAMBDA } from "../constants";
import { Toast } from 'primereact/toast';
import { ProgressBar } from 'primereact/progressbar';
import { RadioButton } from "primereact/radiobutton";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {LambdaClient, InvokeCommand, LogType} from "@aws-sdk/client-lambda";

import { Buffer } from 'buffer';


const HomePage: React.FC = () => {
    
    const toast = useRef<Toast|null>(null);
    const hiddenFileInput = useRef<HTMLInputElement>(null);
    const [videoPath, setVideoPath] = useState<string | null>(null);
    const [gifURL, setGifURL] = useState<string>('');
    const [uplodProgress, setUploadProgress] = useState<boolean>(false);
    const [gifProgress, setGifProgress] = useState<boolean>(false);
    const [quality, setQuality] = useState<string>('1/3');

    const getFilePath = (filename:string) => {
        const httpPrefix = "https://";

        return httpPrefix + S3_BUCKET + '.s3.' + AWS_REGION + '.amazonaws.com/' + UPLOAD_FOLDER  + filename;
    }
    const getGifUrl = (filename:string) => {
        const httpPrefix = "https://";

        return httpPrefix + S3_BUCKET + '.s3.' + AWS_REGION + '.amazonaws.com/' + filename;
    }

    const handleClick = () => {
        if (hiddenFileInput.current) {
            hiddenFileInput.current.click();
          }
      };

    const onSelect = async (e:React.ChangeEvent<HTMLInputElement>) => {
        console.log('on select')
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const path = getFilePath(file.name);
            console.log('file:', path);
            if (file.size > MAX_FILE_SIZE) {
                if(toast.current){
                toast.current.show({ severity:'warn', summary: 'Error', detail: 'File size is too large' });
                }
                return;
            }
            setUploadProgress(true);
            // handle S3 upload
            const credentials = {
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '',
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || ''
            }

            const s3_client = new S3Client({ 
                region: AWS_REGION,
                credentials: credentials, 
            });

            const command = new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: UPLOAD_FOLDER + file.name,
                ContentType: 'video/mp4',
                Body: file
            });

            const result = await s3_client.send(command);
            console.log('after s3 client call')
            if (result){
                setUploadProgress(false);
                if(toast.current){
                toast.current.show({ severity: 'info', summary: 'Success', detail: 'File Uploaded' });
                }
                setVideoPath(path);
            } else{
                setUploadProgress(false);
                if(toast.current){
                toast.current.show({ severity:'error', summary: 'Error', detail: 'Could not upload File' });
                }
            }

            // invoke lambda function to create a GIF
            // pass a path argument
            setGifProgress(true);
            const lambdaResponse = await invoke(VIDEO_LAMBDA, { 'path': UPLOAD_FOLDER + file.name, 'quality': quality });
            const gifS3Path = JSON.parse(lambdaResponse).body;
            setGifProgress(false);
            const gifUrl = getGifUrl(gifS3Path);

            console.log(JSON.parse(lambdaResponse));
            console.log(gifUrl);
            setGifURL(gifUrl);
            if(toast.current){
            toast.current.show({ severity: 'info', summary: 'Success', detail: 'GIF created!' });
            }
            
        }
        console.log('no file')
    }
    const invoke = async (funcName: string, payload: Record<string, any>) => {
        console.log(JSON.stringify(payload));
        const lambdaClient = new LambdaClient({ 
            region: AWS_REGION,
            credentials: {
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '',
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || ''
            }
        });    

        const command = new InvokeCommand({
          FunctionName: funcName,
          Payload: JSON.stringify(payload),
          LogType: LogType.Tail,
        });
      
        const { Payload } = await lambdaClient.send(command);
        const result = Payload ? Buffer.from(Payload).toString():'';

        return result;
    };
 
    return(
        <div>
            <Toast ref={toast}></Toast>
            <div className={classes.main}>
                <div className={classes.title_container}>
                    <p className={classes.title}>Make a cool Gif from your Video! <span className={classes.size}>(maximum 50 MB)</span></p>
                </div>
                <div className={classes.video_arrow}>
                    <div className={classes.video}>
                        {videoPath && !uplodProgress && <video width="320" height="240" controls>
                            <source 
                                src={videoPath} 
                                type="video/mp4">
                            </source>
                        </video>}
                        {gifURL && !gifProgress &&
                            <div className={classes.gif_container}>
                               <Link to={gifURL} className={classes.gif} >Click Here To Get Your GIF!</Link>
                            </div>}
                        {gifProgress &&
                         <div className={classes.gif_container}>
                             <p className={classes.gif}>GIF is making...&nbsp;<img src="assets/images/pot_1.png" alt="pot" className={classes.pot} width="50px"/></p>
                         </div>}
                    </div>
                    {!videoPath && !uplodProgress && <div className={classes.arrow}>
                        <div className={classes.curve}></div>
                        <div className={classes.point}></div>
                    </div>}
                    { uplodProgress && 
                    <div className={classes.progress_bar}>
                         <ProgressBar mode="indeterminate" style={{ height: '6px', width:'300px' }}></ProgressBar>
                     </div>
                    }
                </div>
                {!uplodProgress && <div className={classes.upload}>
                    <button className={videoPath? classes.upload_button_video:classes.upload_button} onClick={handleClick}>
                        <img src="assets/images/upload.png" width="13" alt="upload-img" className={classes.upload_img}/>
                        <span>Upload Video</span>
                    </button>
                    <input
                    type="file"
                    accept="video/*"
                    onChange={onSelect}
                    ref={hiddenFileInput}
                    style={{display: 'none'}}/>
                    <div className={classes.p_radiobutton}>
                        <div>
                            <RadioButton inputId="quality1" name="1/3" value="1/3" tooltip="1 frame per 3 seconds. Less 'animated'" onChange={(e) => setQuality(String(e.value))} checked={quality === '1/3'} />
                            <label htmlFor="quality1" className={classes.radio_label} >Less</label>
                        </div>
                        <div>
                            <RadioButton inputId="quality2" name="1/1" value="1/1" tooltip="1 frame per 1 second. Standard ratio" onChange={(e) => setQuality(String(e.value))} checked={quality === '1/1'} />
                            <label htmlFor="quality2"className={classes.radio_label} >Norm</label>
                        </div>
                        <div>
                            <RadioButton inputId="quality3" name="3/1" value="3/1" tooltip="3 frames per second. Better animated" onChange={(e) => setQuality(String(e.value))} checked={quality === '3/1'} />
                            <label htmlFor="quality3" className={classes.radio_label} >More</label>
                        </div>
                    </div>
                </div>}
            </div>
            <Footer/>
        </div>
        
    )

}

export default HomePage;