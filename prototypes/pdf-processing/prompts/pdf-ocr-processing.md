Working both as a Science teacher and undertaking a Masters of Teaching, I am endlessly working with PDF documents to obtain information from the documents, and to annotate documents to complete tasks such as automated exam marking.

I have found the best process is to keep PDF files on disk and process them using a command line style approach, where a json config files are read, and iterating through a directory of pdf files perform OCR and annotation operations on multi-page pdf documents.

I would like to build a set of rust programs to assist me.

With the first rust program, the PDF files are itterated across, one by one, the filename is read, and then the filename written to the top right of each page in the file using calabri 12 point font. In the directory test-examples/label-exam-pages-with-filename I have a directory called orig that contains an example starting file, and then a second in the update-example directory.

I will add the other functions after this first task is completed. The project directory is here /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing
