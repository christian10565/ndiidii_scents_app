import os, glob
root = '/c/Users/Cicada/Desktop/code/Ndiidii_proj'
print("Searching Ndiidii_proj for inventory files:")
for base, dirs, files in os.walk(root):
    for f in files:
        if 'inventory' in f.lower() or f.lower().endswith(('.xlsx', '.xls', '.csv')):
            print(os.path.join(base, f))
