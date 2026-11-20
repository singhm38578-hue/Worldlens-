package com.worldlens.app.data.local

import android.content.Context
import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.flow.Flow

/**
 * Local Room entity storing structured AI visual scan results on-device.
 * Privacy rule: scan records and optional compact private thumbnails stay strictly on-device
 * and are never uploaded to any cloud storage.
 */
@Entity(tableName = "scan_history")
data class ScanHistoryEntity(
    @PrimaryKey
    val id: String,
    @ColumnInfo(name = "object_name")
    val objectName: String,
    val category: String,
    val explanation: String,
    @ColumnInfo(name = "characteristics_json")
    val characteristicsJson: String,
    @ColumnInfo(name = "useful_facts_json")
    val usefulFactsJson: String,
    @ColumnInfo(name = "confidence_level")
    val confidenceLevel: String,
    @ColumnInfo(name = "confidence_explanation")
    val confidenceExplanation: String,
    @ColumnInfo(name = "language_code")
    val languageCode: String,
    @ColumnInfo(name = "model_name")
    val modelName: String,
    @ColumnInfo(name = "source_label")
    val sourceLabel: String,
    @ColumnInfo(name = "created_at_millis")
    val createdAtMillis: Long,
    @ColumnInfo(name = "thumbnail_path")
    val thumbnailPath: String? = null
)

/**
 * Local Room entity storing Text, Camera, Voice, and Conversation translation history on-device.
 */
@Entity(tableName = "translation_history")
data class TranslationHistoryEntity(
    @PrimaryKey
    val id: String,
    val mode: String,
    @ColumnInfo(name = "source_language_code")
    val sourceLanguageCode: String,
    @ColumnInfo(name = "source_language_name")
    val sourceLanguageName: String,
    @ColumnInfo(name = "target_language_code")
    val targetLanguageCode: String,
    @ColumnInfo(name = "target_language_name")
    val targetLanguageName: String,
    @ColumnInfo(name = "source_text")
    val sourceText: String,
    @ColumnInfo(name = "translated_text")
    val translatedText: String,
    @ColumnInfo(name = "created_at_millis")
    val createdAtMillis: Long
)

@Dao
interface ScanHistoryDao {
    @Query("SELECT * FROM scan_history ORDER BY created_at_millis DESC")
    fun observeAll(): Flow<List<ScanHistoryEntity>>

    @Query("SELECT thumbnail_path FROM scan_history WHERE id = :id LIMIT 1")
    suspend fun getThumbnailPathById(id: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: ScanHistoryEntity)

    @Query("DELETE FROM scan_history WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM scan_history")
    suspend fun clearAll()
}

@Dao
interface TranslationHistoryDao {
    @Query("SELECT * FROM translation_history ORDER BY created_at_millis DESC")
    fun observeAll(): Flow<List<TranslationHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: TranslationHistoryEntity)

    @Query("DELETE FROM translation_history WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM translation_history")
    suspend fun clearAll()
}

/**
 * WorldLens on-device SQLite database via AndroidX Room.
 * Persists both Scan History and Translation History reliably across app restarts
 * without uploading personal history to any server.
 */
@Database(
    entities = [ScanHistoryEntity::class, TranslationHistoryEntity::class],
    version = 2,
    exportSchema = false
)
abstract class WorldLensDatabase : RoomDatabase() {
    abstract fun scanHistoryDao(): ScanHistoryDao
    abstract fun translationHistoryDao(): TranslationHistoryDao

    companion object {
        private const val DATABASE_NAME = "worldlens_local.db"

        /**
         * Non-destructive migration from schema v1 -> v2 adding optional local thumbnail_path
         * so existing users retain all saved scan and translation records across upgrades.
         */
        val MIGRATION_1_2: Migration = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE scan_history ADD COLUMN thumbnail_path TEXT")
            }
        }

        @Volatile
        private var INSTANCE: WorldLensDatabase? = null

        fun getInstance(context: Context): WorldLensDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    WorldLensDatabase::class.java,
                    DATABASE_NAME
                )
                    .addMigrations(MIGRATION_1_2)
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
