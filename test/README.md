## Testing server mocking external location  
  
### Usage:  
Only depends on Flaks --> pretty much safe to run it without creating special venv.  
```
pip3 install -r requirements.txt  
python3 app.py
```
  
#### Login credentials:  
Login: `dupa`  
Password: `qweqweqwe`  
  
#### Available paths:  
`` (empty path)  
`folder1`  
`folder2`  
`folder2/folder3`  
`folder2/folder3/folder4`  
  
Path contents can be checked in python file.  
  
#### Example request  
GET `http://localhost:5000/?l=dupa&p=qweqweqwe&q=folder2/folder3/folder4`  
  
### TODO:  
Automate usage with npm script  
