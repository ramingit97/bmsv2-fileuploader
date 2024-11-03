import { Client } from 'minio';
import express from "express";
import multer from "multer";
import sharp from "sharp"
const app = express();
const upload = multer();
const bucket = "bucket-test"

// Настройка клиента MinIO
const minioClient = new Client({
  endPoint: '0.0.0.0',
  port: 9000,
  useSSL: false,
  accessKey: 'LVnjcYi2e6zM5EwcArd2',
  secretKey: 'zlDYZtNxMIQRobr3fFDbyvCgaHaSYTbWsBNst5JA',
});

const getBuckets = async () => {
  try {
    setTimeout(async()=>{
    const buckets = await minioClient.listBuckets();
    console.log('Buckets:', buckets);
  },3000)
  } catch (error) {
    console.error('Error listing buckets:', error);
  }
};

getBuckets();


app.post('/upload', upload.single('files'), async (req, res) => {
    try {
      // Получение информации о загруженном файле
      const { buffer,...fileInfo } = req.file;
      console.log("req,",req.file);
  
    //   Уменьшение размера изображения с помощью Sharp
      const resizedImageBuffer = await sharp(buffer)
        .resize({ width: 200 }) // Уменьшаем ширину до 800 пикселей
        .toBuffer();
  
      // Загрузка оригинального изображения в MinIO
      await minioClient.putObject('bucket-test', fileInfo.originalname, buffer);
  
      // Загрузка уменьшенного изображения в MinIO
      let fileName = `resized_${fileInfo.originalname}`;
      await minioClient.putObject('bucket-test', fileName, resizedImageBuffer);
      // Отправка URL-адресов в ответе клиенту
      let fileUrl = `http://0.0.0.0:9000/${bucket}/${fileName}`


      return res.status(200).json({
        ...fileInfo,path:fileUrl
      });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).send('Error uploading image');
    }
  });

  app.get('/getSignedUrl/:fileName', async (req, res) => {
    try {
      console.log('12121')
      const { fileName } = req.params;
  
      // Генерация ссылки на объект
      const presignedUrl = await minioClient.presignedGetObject('bucket-test', "resized_Screenshot from 2024-06-21 18-09-51.png", 24 * 60 * 60); // Срок действия ссылки - 24 часа
      console.log('presignedUrl',presignedUrl)

    res.status(200).json({ url: presignedUrl });
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      res.status(500).send('Error generating presigned URL');
    }
  });

app.get("/getObj",(req,res)=>{
  console.log(req.params);
  let data;
  minioClient.getObject("bucket-test", "resized_Screenshot from 2024-06-21 18-09-51.png", function(err, objStream) {
    if (err) {
      return console.log(err)
    }
    objStream.on('data', function(chunk) {
      data = !data ? new Buffer(chunk) : Buffer.concat([data, chunk]);
    })
    objStream.on('end', function() {
      res.writeHead(200, {'Content-Type': 'image/jpeg'});
      res.write(data);
      res.end();
    })
    objStream.on('error', function(err) {
      res.status(500);
      res.send(err);
    })
  });
})

  
  // Запуск сервера Express
  const PORT = process.env.PORT || 9003;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
