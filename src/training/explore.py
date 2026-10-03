import pandas as pd
import re

DATA_PATH = '../../data/imdb_data.csv'

def parse_data():
    df = pd.read_csv(DATA_PATH)
    print(df.shape)
    sentiment_counts = df['sentiment'].value_counts()
    print(sentiment_counts.loc[['positive', 'negative']])
    print(df.isnull().sum())
    df['review'] = df['review'].apply(clean_text)
    print(df.iloc[0]['review'])

def clean_text(text: str) -> str:
    pattern = r"<[^>]+>"
    text = re.sub(pattern, " ", text)
    pattern = r"[\s]+"
    text = re.sub(pattern, " ", text)
    return text

def main():
    parse_data()

if __name__ == "__main__":
    main()