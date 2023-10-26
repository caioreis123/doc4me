# Doc4me

Typing "`doc4me`" in the vscode command pallet [Shift + Command + P (Mac) / Ctrl + Shift + P (Windows/Linux)] to see all available commands and execute them.

All generated files will be stored on a `docs` directory on the project root (this directory location is configurable).

## 1. Doc 4 me the whole project
Will generate a single markdown file for each code file in your project that is target by the app (you can change which files to target in the extension configuration). In this markdown file will be written in plain english (or another language, since the prompt is also configurable) an explanation about the code. A markdown file containing an explanation about the whole project will also be generated. 

## 2. Doc 4 me the current directory
Will generate documentation for just the files stored in the directory of the file the use is currently reading. The markdown explaining the whole project will not be generated.

## 3. Doc 4 me the current file
As you might guess it by now, will generate documentation for just the file the use is currently viewing when the command is called.

## 4. Ask a question about the current file
Opens up an input box in which the user will be able to ask any question about the contents of the currently viewing file. The answer will appear on a popup box, but also on a file named `.qa.txt` inside the already mentioned `docs` directory on the project root.

## 5. Calculate token per file
It is an auxiliary command to help the user estimate the billing for the extension usage. The data will be stored as a csv file named `tokens.csv` on the `docs` directory. Remember that only the tokens of the files will be shown, but Openai also bill for the tokens used on the model response.
